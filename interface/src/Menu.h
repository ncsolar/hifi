//
//  Menu.h
//  interface/src
//
//  Created by Stephen Birarda on 8/12/13.
//  Copyright 2013 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#ifndef hifi_Menu_h
#define hifi_Menu_h

#include <QDir>
#include <QMenuBar>
#include <QHash>
#include <QKeySequence>
#include <QPointer>
#include <QStandardPaths>

#include <EventTypes.h>
#include <MenuItemProperties.h>
#include <OctreeConstants.h>

#if defined(Q_OS_MAC) || defined(Q_OS_WIN)
#include "SpeechRecognizer.h"
#endif

#include "devices/Faceshift.h"
#include "devices/SixenseManager.h"
#include "ui/ChatWindow.h"
#include "ui/JSConsole.h"
#include "ui/ScriptEditorWindow.h"

// Make an LOD handler class and move everything overthere
const float ADJUST_LOD_DOWN_FPS = 40.0;
const float ADJUST_LOD_UP_FPS = 55.0;
const float DEFAULT_ADJUST_AVATAR_LOD_DOWN_FPS = 30.0f;

const quint64 ADJUST_LOD_DOWN_DELAY = 1000 * 1000 * 5;
const quint64 ADJUST_LOD_UP_DELAY = ADJUST_LOD_DOWN_DELAY * 2;

const float ADJUST_LOD_DOWN_BY = 0.9f;
const float ADJUST_LOD_UP_BY = 1.1f;

const float ADJUST_LOD_MIN_SIZE_SCALE = DEFAULT_OCTREE_SIZE_SCALE * 0.25f;
const float ADJUST_LOD_MAX_SIZE_SCALE = DEFAULT_OCTREE_SIZE_SCALE;

const float MINIMUM_AVATAR_LOD_DISTANCE_MULTIPLIER = 0.1f;
const float MAXIMUM_AVATAR_LOD_DISTANCE_MULTIPLIER = 15.0f;
const float DEFAULT_AVATAR_LOD_DISTANCE_MULTIPLIER = 1.0f;

const int ONE_SECOND_OF_FRAMES = 60;
const int FIVE_SECONDS_OF_FRAMES = 5 * ONE_SECOND_OF_FRAMES;
//////////////////////////////////////////////////////////

const float DEFAULT_OCULUS_UI_ANGULAR_SIZE = 72.0f;

const QString SETTINGS_ADDRESS_KEY = "address";
class QSettings;

class AddressBarDialog;
class AnimationsDialog;
class AttachmentsDialog;
class CachesSizeDialog;
class BandwidthDialog;
class DataWebDialog;
class HMDToolsDialog;
class LodToolsDialog;
class LoginDialog;
class OctreeStatsDialog;
class PreferencesDialog;
class MetavoxelEditor;
class MetavoxelNetworkSimulator;
class ChatWindow;
class MenuItemProperties;

class Menu : public QMenuBar {
    Q_OBJECT
public:
    static Menu* getInstance();

    void triggerOption(const QString& menuOption);
    QAction* getActionForOption(const QString& menuOption);

    const InboundAudioStream::Settings& getReceivedAudioStreamSettings() const { return _receivedAudioStreamSettings; }
    void setReceivedAudioStreamSettings(const InboundAudioStream::Settings& receivedAudioStreamSettings) { _receivedAudioStreamSettings = receivedAudioStreamSettings; }
    float getFieldOfView() const { return _fieldOfView; }
    void setFieldOfView(float fieldOfView) { _fieldOfView = fieldOfView; bumpSettings(); }
    float getRealWorldFieldOfView() const { return _realWorldFieldOfView; }
    void setRealWorldFieldOfView(float realWorldFieldOfView) { _realWorldFieldOfView = realWorldFieldOfView; bumpSettings(); }
    float getOculusUIAngularSize() const { return _oculusUIAngularSize; }
    void setOculusUIAngularSize(float oculusUIAngularSize) { _oculusUIAngularSize = oculusUIAngularSize; bumpSettings(); }
    float getSixenseReticleMoveSpeed() const { return _sixenseReticleMoveSpeed; }
    void setSixenseReticleMoveSpeed(float sixenseReticleMoveSpeed) { _sixenseReticleMoveSpeed = sixenseReticleMoveSpeed; bumpSettings(); }
    bool getInvertSixenseButtons() const { return _invertSixenseButtons; }
    void setInvertSixenseButtons(bool invertSixenseButtons) { _invertSixenseButtons = invertSixenseButtons; bumpSettings(); }

    float getFaceshiftEyeDeflection() const { return _faceshiftEyeDeflection; }
    void setFaceshiftEyeDeflection(float faceshiftEyeDeflection) { _faceshiftEyeDeflection = faceshiftEyeDeflection; bumpSettings(); }
    const QString& getFaceshiftHostname() const { return _faceshiftHostname; }
    void setFaceshiftHostname(const QString& hostname) { _faceshiftHostname = hostname; bumpSettings(); }
    QString getSnapshotsLocation() const;
    void setSnapshotsLocation(QString snapshotsLocation) { _snapshotsLocation = snapshotsLocation; bumpSettings(); }

    const QString& getScriptsLocation() const { return _scriptsLocation; }
    void setScriptsLocation(const QString& scriptsLocation);

    BandwidthDialog* getBandwidthDialog() const { return _bandwidthDialog; }
    OctreeStatsDialog* getOctreeStatsDialog() const { return _octreeStatsDialog; }
    LodToolsDialog* getLodToolsDialog() const { return _lodToolsDialog; }
    HMDToolsDialog* getHMDToolsDialog() const { return _hmdToolsDialog; }

    bool getShadowsEnabled() const;

    // User Tweakable LOD Items
    QString getLODFeedbackText();
    void autoAdjustLOD(float currentFPS);
    void resetLODAdjust();
    void setOctreeSizeScale(float sizeScale);
    float getOctreeSizeScale() const { return _octreeSizeScale; }
    void setAutomaticAvatarLOD(bool automaticAvatarLOD) { _automaticAvatarLOD = automaticAvatarLOD; bumpSettings(); }
    bool getAutomaticAvatarLOD() const { return _automaticAvatarLOD; }
    void setAvatarLODDecreaseFPS(float avatarLODDecreaseFPS) { _avatarLODDecreaseFPS = avatarLODDecreaseFPS; bumpSettings(); }
    float getAvatarLODDecreaseFPS() const { return _avatarLODDecreaseFPS; }
    void setAvatarLODIncreaseFPS(float avatarLODIncreaseFPS) { _avatarLODIncreaseFPS = avatarLODIncreaseFPS; bumpSettings(); }
    float getAvatarLODIncreaseFPS() const { return _avatarLODIncreaseFPS; }
    void setAvatarLODDistanceMultiplier(float multiplier) { _avatarLODDistanceMultiplier = multiplier; bumpSettings(); }
    float getAvatarLODDistanceMultiplier() const { return _avatarLODDistanceMultiplier; }
    void setBoundaryLevelAdjust(int boundaryLevelAdjust);
    int getBoundaryLevelAdjust() const { return _boundaryLevelAdjust; }

    bool shouldRenderMesh(float largestDimension, float distanceToCamera);

#if defined(Q_OS_MAC) || defined(Q_OS_WIN)
    SpeechRecognizer* getSpeechRecognizer() { return &_speechRecognizer; }
#endif

    // User Tweakable PPS from Voxel Server
    int getMaxOctreePacketsPerSecond() const { return _maxOctreePacketsPerSecond; }
    void setMaxOctreePacketsPerSecond(int value) { _maxOctreePacketsPerSecond = value; bumpSettings(); }

    QAction* addActionToQMenuAndActionHash(QMenu* destinationMenu,
                                           const QString& actionName,
                                           const QKeySequence& shortcut = 0,
                                           const QObject* receiver = NULL,
                                           const char* member = NULL,
                                           QAction::MenuRole role = QAction::NoRole,
                                           int menuItemLocation = UNSPECIFIED_POSITION);
    QAction* addActionToQMenuAndActionHash(QMenu* destinationMenu,
                                           QAction* action,
                                           const QString& actionName = QString(),
                                           const QKeySequence& shortcut = 0,
                                           QAction::MenuRole role = QAction::NoRole,
                                           int menuItemLocation = UNSPECIFIED_POSITION);

    void removeAction(QMenu* menu, const QString& actionName);
    
    const QByteArray& getWalletPrivateKey() const { return _walletPrivateKey; }

signals:
    void scriptLocationChanged(const QString& newPath);

public slots:

    void clearLoginDialogDisplayedFlag();
    void loginForCurrentDomain();
    void showLoginForCurrentDomain();
    void bandwidthDetails();
    void octreeStatsDetails();
    void cachesSizeDialog();
    void lodTools();
    void hmdTools(bool showTools);
    void loadSettings(QSettings* settings = NULL);
    void saveSettings(QSettings* settings = NULL);
    void importSettings();
    void exportSettings();
    void toggleAddressBar();

    void toggleLoginMenuItem();
    void toggleSixense(bool shouldEnable);

    QMenu* addMenu(const QString& menuName);
    void removeMenu(const QString& menuName);
    bool menuExists(const QString& menuName);
    void addSeparator(const QString& menuName, const QString& separatorName);
    void removeSeparator(const QString& menuName, const QString& separatorName);
    void addMenuItem(const MenuItemProperties& properties);
    void removeMenuItem(const QString& menuName, const QString& menuitem);
    bool menuItemExists(const QString& menuName, const QString& menuitem);
    bool isOptionChecked(const QString& menuOption) const;
    void setIsOptionChecked(const QString& menuOption, bool isChecked);

private slots:
    void aboutApp();
    void showEditEntitiesHelp();
    void bumpSettings();
    void editPreferences();
    void editAttachments();
    void editAnimations();
    void changePrivateKey();
    void nameLocation();
    void toggleLocationList();
    void hmdToolsClosed();
    void runTests();
    void showMetavoxelEditor();
    void showMetavoxelNetworkSimulator();
    void showScriptEditor();
    void showChat();
    void toggleConsole();
    void toggleToolWindow();
    void toggleChat();
    void audioMuteToggled();
    void displayNameLocationResponse(const QString& errorString);
    void changeVSync();

private:
    static Menu* _instance;

    Menu();

    typedef void(*settingsAction)(QSettings*, QAction*);
    static void loadAction(QSettings* set, QAction* action);
    static void saveAction(QSettings* set, QAction* action);
    void scanMenuBar(settingsAction modifySetting, QSettings* set);
    void scanMenu(QMenu* menu, settingsAction modifySetting, QSettings* set);

    /// helper method to have separators with labels that are also compatible with OS X
    void addDisabledActionAndSeparator(QMenu* destinationMenu, const QString& actionName,
                                                int menuItemLocation = UNSPECIFIED_POSITION);

    QAction* addCheckableActionToQMenuAndActionHash(QMenu* destinationMenu,
                                                    const QString& actionName,
                                                    const QKeySequence& shortcut = 0,
                                                    const bool checked = false,
                                                    const QObject* receiver = NULL,
                                                    const char* member = NULL,
                                                    int menuItemLocation = UNSPECIFIED_POSITION);

    QAction* getActionFromName(const QString& menuName, QMenu* menu);
    QMenu* getSubMenuFromName(const QString& menuName, QMenu* menu);
    QMenu* getMenuParent(const QString& menuName, QString& finalMenuPart);

    QAction* getMenuAction(const QString& menuName);
    int findPositionOfMenuItem(QMenu* menu, const QString& searchMenuItem);
    int positionBeforeSeparatorIfNeeded(QMenu* menu, int requestedPosition);
    QMenu* getMenu(const QString& menuName);


    QHash<QString, QAction*> _actionHash;
    InboundAudioStream::Settings _receivedAudioStreamSettings;
    // in Degrees, doesn't apply to HMD like Oculus
    float _fieldOfView = DEFAULT_FIELD_OF_VIEW_DEGREES;
    //  The actual FOV set by the user's monitor size and view distance
    float _realWorldFieldOfView = DEFAULT_REAL_WORLD_FIELD_OF_VIEW_DEGREES;
    float _faceshiftEyeDeflection = DEFAULT_FACESHIFT_EYE_DEFLECTION;
    QString _faceshiftHostname = DEFAULT_FACESHIFT_HOSTNAME;
    
    QDialog* _jsConsole = nullptr;
#if defined(Q_OS_MAC) || defined(Q_OS_WIN)
    SpeechRecognizer _speechRecognizer;
#endif
    float _octreeSizeScale = DEFAULT_OCTREE_SIZE_SCALE;
    float _oculusUIAngularSize = DEFAULT_OCULUS_UI_ANGULAR_SIZE;
    float _sixenseReticleMoveSpeed = DEFAULT_SIXENSE_RETICLE_MOVE_SPEED;
    bool _invertSixenseButtons = DEFAULT_INVERT_SIXENSE_MOUSE_BUTTONS;
    bool _hasLoginDialogDisplayed = false;
    
    bool _automaticAvatarLOD = true;
    float _avatarLODDecreaseFPS = DEFAULT_ADJUST_AVATAR_LOD_DOWN_FPS;
    float _avatarLODIncreaseFPS = ADJUST_LOD_UP_FPS;
    float _avatarLODDistanceMultiplier = DEFAULT_AVATAR_LOD_DISTANCE_MULTIPLIER;
    
    int _boundaryLevelAdjust = 0;
    int _maxOctreePacketsPerSecond = DEFAULT_MAX_OCTREE_PPS;
    
    quint64 _lastAdjust;
    quint64 _lastAvatarDetailDrop;
    
    SimpleMovingAverage _fpsAverage = FIVE_SECONDS_OF_FRAMES;
    SimpleMovingAverage _fastFPSAverage = ONE_SECOND_OF_FRAMES;
    
    QPointer<AddressBarDialog> _addressBarDialog;
    QPointer<AnimationsDialog> _animationsDialog;
    QPointer<AttachmentsDialog> _attachmentsDialog;
    QPointer<BandwidthDialog> _bandwidthDialog;
    QPointer<CachesSizeDialog> _cachesSizeDialog;
    QPointer<DataWebDialog> _newLocationDialog;
    QPointer<DataWebDialog> _userLocationsDialog;
    QPointer<HMDToolsDialog> _hmdToolsDialog;
    QPointer<LodToolsDialog> _lodToolsDialog;
    QPointer<LoginDialog> _loginDialog;
    QPointer<OctreeStatsDialog> _octreeStatsDialog;
    QPointer<PreferencesDialog> _preferencesDialog;

    QPointer<MetavoxelEditor> _MetavoxelEditor;
    QPointer<MetavoxelNetworkSimulator> _metavoxelNetworkSimulator;
    QPointer<ScriptEditorWindow> _ScriptEditor;
    QPointer<ChatWindow> _chatWindow;
    
    QAction* _loginAction = nullptr;
    QAction* _chatAction = nullptr;
    QString _snapshotsLocation;
    QString _scriptsLocation;
    QByteArray _walletPrivateKey;
    
    bool _shouldRenderTableNeedsRebuilding = true;
    QMap<float, float> _shouldRenderTable;
};

namespace MenuOption {
    const QString AboutApp = "About Interface";
    const QString AddressBar = "Show Address Bar";
    const QString AlignForearmsWithWrists = "Align Forearms with Wrists";
    const QString AlternateIK = "Alternate IK";
    const QString AmbientOcclusion = "Ambient Occlusion";
    const QString Animations = "Animations...";
    const QString Atmosphere = "Atmosphere";
    const QString Attachments = "Attachments...";
    const QString AudioNoiseReduction = "Audio Noise Reduction";
    const QString AudioScope = "Show Scope";
    const QString AudioScopeFiftyFrames = "Fifty";
    const QString AudioScopeFiveFrames = "Five";
    const QString AudioScopeFrames = "Display Frames";
    const QString AudioScopePause = "Pause Scope";
    const QString AudioScopeTwentyFrames = "Twenty";
    const QString AudioStats = "Audio Stats";
    const QString AudioStatsShowInjectedStreams = "Audio Stats Show Injected Streams";
    const QString AudioSourceInject = "Generated Audio";
    const QString AudioSourcePinkNoise = "Pink Noise";
    const QString AudioSourceSine440 = "Sine 440hz";
    const QString Avatars = "Avatars";
    const QString Bandwidth = "Bandwidth Display";
    const QString BandwidthDetails = "Bandwidth Details";
    const QString BlueSpeechSphere = "Blue Sphere While Speaking";
    const QString CascadedShadows = "Cascaded";
    const QString CachesSize = "Caches Size";
    const QString Chat = "Chat...";
    const QString ChatCircling = "Chat Circling";
    const QString CollideAsRagdoll = "Collide With Self (Ragdoll)";
    const QString CollideWithAvatars = "Collide With Other Avatars";
    const QString CollideWithEnvironment = "Collide With World Boundaries";
    const QString Collisions = "Collisions";
    const QString Console = "Console...";
    const QString ControlWithSpeech = "Control With Speech";
    const QString DontRenderEntitiesAsScene = "Don't Render Entities as Scene";
    const QString DontDoPrecisionPicking = "Don't Do Precision Picking";
    const QString DecreaseAvatarSize = "Decrease Avatar Size";
    const QString DisableActivityLogger = "Disable Activity Logger";
    const QString DisableAutoAdjustLOD = "Disable Automatically Adjusting LOD";
    const QString DisableLightEntities = "Disable Light Entities";
    const QString DisableNackPackets = "Disable NACK Packets";
    const QString DisplayHands = "Show Hand Info";
    const QString DisplayHandTargets = "Show Hand Targets";
    const QString DisplayHermiteData = "Display Hermite Data";
    const QString DisplayModelBounds = "Display Model Bounds";
    const QString DisplayModelTriangles = "Display Model Triangles";
    const QString DisplayModelElementChildProxies = "Display Model Element Children";
    const QString DisplayModelElementProxy = "Display Model Element Bounds";
    const QString DisplayTimingDetails = "Display Timing Details";
    const QString DontFadeOnOctreeServerChanges = "Don't Fade In/Out on Octree Server Changes";
    const QString EchoLocalAudio = "Echo Local Audio";
    const QString EchoServerAudio = "Echo Server Audio";
    const QString EditEntitiesHelp = "Edit Entities Help...";
    const QString Enable3DTVMode = "Enable 3DTV Mode";
    const QString EnableGlowEffect = "Enable Glow Effect (Warning: Poor Oculus Performance)";
    const QString EnableVRMode = "Enable VR Mode";
    const QString Entities = "Entities";
    const QString ExpandMyAvatarSimulateTiming = "Expand /myAvatar/simulation";
    const QString ExpandMyAvatarTiming = "Expand /myAvatar";
    const QString ExpandOtherAvatarTiming = "Expand /otherAvatar";
    const QString ExpandPaintGLTiming = "Expand /paintGL";
    const QString ExpandUpdateTiming = "Expand /update";
    const QString Faceshift = "Faceshift";
    const QString FilterSixense = "Smooth Sixense Movement";
    const QString FirstPerson = "First Person";
    const QString FrameTimer = "Show Timer";
    const QString Fullscreen = "Fullscreen";
    const QString FullscreenMirror = "Fullscreen Mirror";
    const QString GlowWhenSpeaking = "Glow When Speaking";
    const QString NamesAboveHeads = "Names Above Heads";
    const QString GoToUser = "Go To User";
    const QString HMDTools = "HMD Tools";
    const QString IncreaseAvatarSize = "Increase Avatar Size";
    const QString KeyboardMotorControl = "Enable Keyboard Motor Control";
    const QString LeapMotionOnHMD = "Leap Motion on HMD";
    const QString LoadScript = "Open and Run Script File...";
    const QString LoadScriptURL = "Open and Run Script from URL...";
    const QString LodTools = "LOD Tools";
    const QString Login = "Login";
    const QString Log = "Log";
    const QString Logout = "Logout";
    const QString LowVelocityFilter = "Low Velocity Filter";
    const QString MetavoxelEditor = "Metavoxel Editor...";
    const QString Metavoxels = "Metavoxels";
    const QString Mirror = "Mirror";
    const QString MuteAudio = "Mute Microphone";
    const QString MuteEnvironment = "Mute Environment";
    const QString MyLocations = "My Locations...";
    const QString NameLocation = "Name this location";
    const QString NetworkSimulator = "Network Simulator...";
    const QString NewVoxelCullingMode = "New Voxel Culling Mode";
    const QString ObeyEnvironmentalGravity = "Obey Environmental Gravity";
    const QString OctreeStats = "Voxel and Entity Statistics";
    const QString OffAxisProjection = "Off-Axis Projection";
    const QString OldVoxelCullingMode = "Old Voxel Culling Mode";
    const QString Pair = "Pair";
    const QString PipelineWarnings = "Log Render Pipeline Warnings";
    const QString Preferences = "Preferences...";
    const QString Quit =  "Quit";
    const QString ReloadAllScripts = "Reload All Scripts";
    const QString RenderBoundingCollisionShapes = "Show Bounding Collision Shapes";
    const QString RenderDualContourSurfaces = "Render Dual Contour Surfaces";
    const QString RenderFocusIndicator = "Show Eye Focus";
    const QString RenderHeadCollisionShapes = "Show Head Collision Shapes";
    const QString RenderLookAtVectors = "Show Look-at Vectors";
    const QString RenderSkeletonCollisionShapes = "Show Skeleton Collision Shapes";
    const QString RenderSpanners = "Render Spanners";
    const QString RenderTargetFramerate = "Framerate";
    const QString RenderTargetFramerateUnlimited = "Unlimited";
    const QString RenderTargetFramerate60 = "60";
    const QString RenderTargetFramerate50 = "50";
    const QString RenderTargetFramerate40 = "40";
    const QString RenderTargetFramerate30 = "30";
    const QString RenderTargetFramerateVSyncOn = "V-Sync On";
    const QString RenderResolution = "Scale Resolution";
    const QString RenderResolutionOne = "1";
    const QString RenderResolutionTwoThird = "2/3";
    const QString RenderResolutionHalf = "1/2";
    const QString RenderResolutionThird = "1/3";
    const QString RenderResolutionQuarter = "1/4";
    const QString ResetAvatarSize = "Reset Avatar Size";
    const QString ResetSensors = "Reset Sensors";
    const QString RunningScripts = "Running Scripts";
    const QString RunTimingTests = "Run Timing Tests";
    const QString ScriptEditor = "Script Editor...";
    const QString ScriptedMotorControl = "Enable Scripted Motor Control";
    const QString SettingsExport = "Export Settings";
    const QString SettingsImport = "Import Settings";
    const QString ShowBordersEntityNodes = "Show Entity Nodes";
    const QString ShowBordersVoxelNodes = "Show Voxel Nodes";
    const QString ShowIKConstraints = "Show IK Constraints";
    const QString SimpleShadows = "Simple";
    const QString SixenseEnabled = "Enable Hydra Support";
    const QString SixenseMouseInput = "Enable Sixense Mouse Input";
    const QString SixenseLasers = "Enable Sixense UI Lasers";
    const QString StandOnNearbyFloors = "Stand on nearby floors";
    const QString ShiftHipsForIdleAnimations = "Shift hips for idle animations";
    const QString Stars = "Stars";
    const QString Stats = "Stats";
    const QString StereoAudio = "Stereo Audio";
    const QString StopAllScripts = "Stop All Scripts";
    const QString SuppressShortTimings = "Suppress Timings Less than 10ms";
    const QString TestPing = "Test Ping";
    const QString ToolWindow = "Tool Window";
    const QString TransmitterDrive = "Transmitter Drive";
    const QString TurnWithHead = "Turn using Head";
    const QString UploadAttachment = "Upload Attachment Model";
    const QString UploadEntity = "Upload Entity Model";
    const QString UploadHead = "Upload Head Model";
    const QString UploadSkeleton = "Upload Skeleton Model";
    const QString UserInterface = "User Interface";
    const QString Visage = "Visage";
    const QString WalletPrivateKey = "Wallet Private Key...";
    const QString Wireframe = "Wireframe";
}

void sendFakeEnterEvent();

#endif // hifi_Menu_h
