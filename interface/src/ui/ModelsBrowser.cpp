//
//  ModelsBrowser.cpp
//  interface/src/ui
//
//  Created by Clement on 3/17/14.
//  Copyright 2014 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#include <QDialog>
#include <QDialogButtonBox>
#include <QGridLayout>
#include <QHeaderView>
#include <QMessageBox>
#include <QNetworkAccessManager>
#include <QUrl>
#include <QXmlStreamReader>

#include "Application.h"

#include "ModelsBrowser.h"

static const QString S3_URL = "http://highfidelity-public.s3-us-west-1.amazonaws.com";
static const QString PUBLIC_URL = "http://public.highfidelity.io";
static const QString HEAD_MODELS_LOCATION = "models/heads";
static const QString SKELETON_MODELS_LOCATION = "models/skeletons/";

static const QString PREFIX_PARAMETER_NAME = "prefix";
static const QString MARKER_PARAMETER_NAME = "marker";
static const QString IS_TRUNCATED_NAME = "IsTruncated";
static const QString CONTAINER_NAME = "Contents";
static const QString KEY_NAME = "Key";
static const QString LOADING_MSG = "Loading...";
static const QString ERROR_MSG = "Error loading files";

static const QString DO_NOT_MODIFY_TAG = "DoNotModify";

enum ModelMetaData {
    NAME,
    CREATOR,
    DATE_ADDED,
    TOTAL_SIZE,
    POLY_NUM,
    TAGS,
    
    MODEL_METADATA_COUNT
};
static const QString propertiesNames[MODEL_METADATA_COUNT] = {
    "Name",
    "Creator",
    "Date Added",
    "Total Size",
    "Poly#",
    "Tags"
};
static const QString propertiesIds[MODEL_METADATA_COUNT] = {
    DO_NOT_MODIFY_TAG,
    "Creator",
    "Date-Added",
    "Total-Size",
    "Poly-Num",
    "Tags"
};

ModelsBrowser::ModelsBrowser(ModelType modelsType, QWidget* parent) :
    QWidget(parent),
    _handler(new ModelHandler(modelsType))
{
    connect(_handler, SIGNAL(doneDownloading()), SLOT(resizeView()));
    connect(_handler, SIGNAL(updated()), SLOT(resizeView()));
    
    // Connect handler
    _handler->connect(this, SIGNAL(startDownloading()), SLOT(download()));
    _handler->connect(_handler, SIGNAL(doneDownloading()), SLOT(update()));
    _handler->connect(this, SIGNAL(destroyed()), SLOT(exit()));
    
    // Setup and launch update thread
    QThread* thread = new QThread();
    thread->connect(_handler, SIGNAL(destroyed()), SLOT(quit()));
    thread->connect(thread, SIGNAL(finished()), SLOT(deleteLater()));
    _handler->moveToThread(thread);
    thread->start();
    emit startDownloading();
    
    // Initialize the view
    _view.setEditTriggers(QAbstractItemView::NoEditTriggers);
    _view.setRootIsDecorated(false);
    _view.setModel(_handler->getModel());
}

void ModelsBrowser::applyFilter(const QString &filter) {
    QStringList filters = filter.split(" ");
    
    _handler->lockModel();
    QStandardItemModel* model = _handler->getModel();
    int rows = model->rowCount();
    
    // Try and match every filter with each rows
    for (int i = 0; i < rows; ++i) {
        bool match = false;
        for (int k = 0; k < filters.count(); ++k) {
            match = false;
            for (int j = 0; j < MODEL_METADATA_COUNT; ++j) {
                if (model->item(i, j)->text().contains(filters.at(k), Qt::CaseInsensitive)) {
                    match = true;
                    break;
                }
            }
            if (!match) {
                break;
            }
        }
        
        // Hid the row if it doesn't match (Make sure it's not it it does)
        if (match) {
            _view.setRowHidden(i, QModelIndex(), false);
        } else {
            _view.setRowHidden(i, QModelIndex(), true);
        }
    }
    _handler->unlockModel();
}

void ModelsBrowser::resizeView() {
    for (int i = 0; i < MODEL_METADATA_COUNT; ++i) {
        _view.resizeColumnToContents(i);
    }
}

void ModelsBrowser::browse() {
    QDialog dialog;
    dialog.setWindowTitle("Browse models");
    dialog.setMinimumSize(570, 500);
    
    QGridLayout* layout = new QGridLayout(&dialog);
    dialog.setLayout(layout);
    
    QLineEdit* searchBar = new QLineEdit(&dialog);
    layout->addWidget(searchBar, 0, 0);
    
    layout->addWidget(&_view, 1, 0);
    dialog.connect(&_view, SIGNAL(doubleClicked(const QModelIndex&)), SLOT(accept()));
    connect(searchBar, SIGNAL(textChanged(const QString&)), SLOT(applyFilter(const QString&)));
    
    QDialogButtonBox* buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel);
    layout->addWidget(buttons, 2, 0);
    dialog.connect(buttons, SIGNAL(accepted()), SLOT(accept()));
    dialog.connect(buttons, SIGNAL(rejected()), SLOT(reject()));
    
    if (dialog.exec() == QDialog::Accepted) {
        _handler->lockModel();
        QVariant selectedFile = _handler->getModel()->data(_view.currentIndex(), Qt::UserRole);
        _handler->unlockModel();
        if (selectedFile.isValid()) {
            emit selected(selectedFile.toString());
        }
    }
    
    // So that we don't have to reconstruct the view
    _view.setParent(NULL);
}


ModelHandler::ModelHandler(ModelType modelsType, QWidget* parent) :
    QObject(parent),
    _initiateExit(false),
    _type(modelsType)
{
    // set headers data
    QStringList headerData;
    for (int i = 0; i < MODEL_METADATA_COUNT; ++i) {
        headerData << propertiesNames[i];
    }
    _model.setHorizontalHeaderLabels(headerData);
}

void ModelHandler::download() {
    _lock.lockForWrite();
    if (_initiateExit) {
        _lock.unlock();
        return;
    }
    // Show loading message
    QStandardItem* loadingItem = new QStandardItem(LOADING_MSG);
    loadingItem->setEnabled(false);
    _model.appendRow(loadingItem);
    _lock.unlock();
    
    // Query models list
    queryNewFiles();
}

void ModelHandler::update() {
    _lock.lockForWrite();
    if (_initiateExit) {
        _lock.unlock();
        return;
    }
    for (int i = 0; i < _model.rowCount(); ++i) {
        QUrl url(_model.item(i,0)->data(Qt::UserRole).toString());
        QNetworkAccessManager* accessManager = new QNetworkAccessManager(this);
        QNetworkRequest request(url);
        accessManager->head(request);
        connect(accessManager, SIGNAL(finished(QNetworkReply*)), SLOT(downloadFinished(QNetworkReply*)));
    }
    _lock.unlock();
}

void ModelHandler::exit() {
    _lock.lockForWrite();
    _initiateExit = true;
    
    // Disconnect everything
    disconnect();
    thread()->disconnect();
    
    // Make sure the thread will exit correctly
    thread()->connect(this, SIGNAL(destroyed()), SLOT(quit()));
    thread()->connect(thread(), SIGNAL(finished()), SLOT(deleteLater()));
    deleteLater();
    _lock.unlock();
}

void ModelHandler::downloadFinished(QNetworkReply* reply) {
    QByteArray data = reply->readAll();
    
    if (!data.isEmpty()) {
        parseXML(data);
    } else {
        parseHeaders(reply);
    }
    reply->deleteLater();
    sender()->deleteLater();
}

void ModelHandler::queryNewFiles(QString marker) {
    if (_initiateExit) {
        return;
    }
    
    // Build query
    QUrl url(S3_URL);
    QUrlQuery query;
    if (_type == Head) {
        query.addQueryItem(PREFIX_PARAMETER_NAME, HEAD_MODELS_LOCATION);
    } else if (_type == Skeleton) {
        query.addQueryItem(PREFIX_PARAMETER_NAME, SKELETON_MODELS_LOCATION);
    }
    
    if (!marker.isEmpty()) {
        query.addQueryItem(MARKER_PARAMETER_NAME, marker);
    }
    
    // Download
    url.setQuery(query);
    QNetworkAccessManager* accessManager = new QNetworkAccessManager(this);
    QNetworkRequest request(url);
    accessManager->get(request);
    connect(accessManager, SIGNAL(finished(QNetworkReply*)), SLOT(downloadFinished(QNetworkReply*)));
            
}

bool ModelHandler::parseXML(QByteArray xmlFile) {
    _lock.lockForWrite();
    if (_initiateExit) {
        _lock.unlock();
        return false;
    }
    
    QXmlStreamReader xml(xmlFile);
    QRegExp rx(".*fst");
    bool truncated = false;
    QString lastKey;
    
    // Remove loading indication
    int oldLastRow = _model.rowCount() - 1;
    delete _model.takeRow(oldLastRow).first();
    
    // Read xml until the end or an error is detected
    while(!xml.atEnd() && !xml.hasError()) {
        if (_initiateExit) {
            _lock.unlock();
            return false;
        }
        
        if(xml.tokenType() == QXmlStreamReader::StartElement && xml.name() == IS_TRUNCATED_NAME) {
            while(!(xml.tokenType() == QXmlStreamReader::EndElement && xml.name() == IS_TRUNCATED_NAME)) {
                // Let's check if there is more
                xml.readNext();
                if (xml.text().toString() == "True") {
                    truncated = true;
                }
            }
        }

        if(xml.tokenType() == QXmlStreamReader::StartElement && xml.name() == CONTAINER_NAME) {
            while(!(xml.tokenType() == QXmlStreamReader::EndElement && xml.name() == CONTAINER_NAME)) {
                // If a file is find, process it
                if(xml.tokenType() == QXmlStreamReader::StartElement && xml.name() == KEY_NAME) {
                    xml.readNext();
                    lastKey = xml.text().toString();
                    if (rx.exactMatch(xml.text().toString())) {
                        // Add the found file to the list
                        QList<QStandardItem*> model;
                        model << new QStandardItem(QFileInfo(xml.text().toString()).baseName());
                        model.first()->setData(PUBLIC_URL + "/" + xml.text().toString(), Qt::UserRole);
                        for (int i = 1; i < MODEL_METADATA_COUNT; ++i) {
                            model << new QStandardItem();
                        }
                        
                        _model.appendRow(model);
                    }
                }
                xml.readNext();
            }
        }
        xml.readNext();
    }
    
    // Error handling
    if(xml.hasError()) {
        _model.clear();
        QStandardItem* errorItem = new QStandardItem(ERROR_MSG);
        errorItem->setEnabled(false);
        _model.appendRow(errorItem);
        
        _lock.unlock();
        return false;
    }
    
    // If we didn't all the files, download the next ones
    if (truncated) {
        // Indicate more files are being loaded
        QStandardItem* loadingItem = new QStandardItem(LOADING_MSG);
        loadingItem->setEnabled(false);
        _model.appendRow(loadingItem);
        
        // query those files
        queryNewFiles(lastKey);
    }
    _lock.unlock();
    
    if (!truncated) {
        emit doneDownloading();
    }
    
    return true;
}

bool ModelHandler::parseHeaders(QNetworkReply* reply) {
    _lock.lockForWrite();
    
    QList<QStandardItem*> items = _model.findItems(QFileInfo(reply->url().toString()).baseName());
    if (items.isEmpty() || items.first()->text() == DO_NOT_MODIFY_TAG) {
        return false;
    }
    
    for (int i = 0; i < MODEL_METADATA_COUNT; ++i) {
        for (int k = 1; k < reply->rawHeaderPairs().count(); ++k) {
            QString key = reply->rawHeaderPairs().at(k).first.data();
            QString item = reply->rawHeaderPairs().at(k).second.data();
            if (key == propertiesIds[i]) {
                _model.item(_model.indexFromItem(items.first()).row(), i)->setText(item);
            }
        }
    }
    _lock.unlock();
    
    emit updated();
    return true;
}

