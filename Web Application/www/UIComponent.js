
//define the extension for custom button

function MyUIExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}
MyUIExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
MyUIExtension.prototype.constructor = MyUIExtension;

MyUIExtension.prototype.onToolbarCreated = function() {
    this.viewer.removeEventListener(av.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
    this.onToolbarCreatedBinded = null;
    this.createUI();
};

MyUIExtension.prototype.createUI = function() {

    var viewer = this.viewer;

    // Button
    var button1 = new Autodesk.Viewing.UI.Button('clash-button');
    button1.icon.style.fontSize = "24px";
    button1.icon.className = 'glyphicon glyphicon-warning-sign';
    button1.onClick = function(e) {
        //viewer.setViewCube('front');

        if(this._clashPanel == null) {
            var options = {};
            this._clashPanel = new  ClashTestExtension(viewer, options);
            this._clashPanel.load();
        }
        else
        {
            this._clashPanel.onShowPanel();
        }
    };
    button1.addClass('clash-button');
    button1.setToolTip('Clash View');

    // SubToolbar
    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('my-custom-toolbar');
    this.subToolbar.addControl(button1);

    viewer.toolbar.addControl(this.subToolbar);
};

MyUIExtension.prototype.load = function() {

    var viewer = this.viewer;

    if (this.viewer.toolbar) {
        // Toolbar is already available, create the UI
        this.createUI();
    } else {
        // Toolbar hasn't been created yet, wait until we get notification of its creation
        this.onToolbarCreatedBinded = this.onToolbarCreated.bind(this);
        this.viewer.addEventListener(av.TOOLBAR_CREATED_EVENT, this.onToolbarCreatedBinded);
    }

    return true;
};

MyUIExtension.prototype.unload = function() {

    this.viewer.toolbar.removeControl(this.subToolbar);

    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('MyUIExtension', MyUIExtension);