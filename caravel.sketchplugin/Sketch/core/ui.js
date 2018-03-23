@import "core/MochaJSDelegate.js";
@import "core/api.js";

var ui = new UI();

function createLabel(value, fontSize, hidden, frame) {
  var label = [[NSTextField alloc] initWithFrame:frame];
  [label setEditable:false];
  [label setBordered:false];
  [label setDrawsBackground:false];
  [label setFont:[NSFont systemFontOfSize:fontSize]];
  [label setStringValue:value];
  [label setHidden: hidden];
  return label;
}

function createButton(title, enabled, frame) {
  var button = [[NSButton alloc] initWithFrame:frame];
  [button setEnabled: enabled];
  [button setTitle:title];
  [button setBezelStyle:NSRoundedBezelStyle];
  return button;
}

function createRadioButtons(items, numRows, numCols, frame, cellWidth, cellHeight, title, defaultSelection) {
  if (typeof items === "undefined" || items.length == 0) {
    return;
  }

  var buttonCell = [NSButtonCell new],
    title = (typeof title !== "undefined") ? title : "Radio Buttons",
    numRows = (typeof numRows !== "undefined") ? numRows : 1,
    numCols = (typeof numCols !== "undefined") ? numCols : items.length,
    defaultSelection = (typeof defaultSelection !== "undefined") ? defaultSelection : 0,
    matrixRect = frame,
    numItems = items.length,
    itemName;

  [buttonCell setTitle:title];
  [buttonCell setButtonType:NSRadioButton];

  var buttonMatrix = [[NSMatrix alloc] initWithFrame:matrixRect mode:NSRadioModeMatrix prototype:buttonCell numberOfRows:numRows numberOfColumns:numCols],
    cells = [buttonMatrix cells];

  [buttonMatrix setAutorecalculatesCellSize:true];
  [buttonMatrix setIntercellSpacing:NSMakeSize(10,10)];
  [buttonMatrix setCellSize:NSMakeSize(cellWidth, cellHeight)]

  for (var i = 0; i<numItems; i++) {
    itemName = items[i];
    [[cells objectAtIndex:i] setTitle:itemName];
    [[cells objectAtIndex:i] setTag:(i+100)];
  }

  [buttonMatrix selectCellWithTag:(defaultSelection+100)];

  return buttonMatrix;
}

function showAlert(title, message, context) {
  var alert = [[NSAlert alloc] init];

  [alert setMessageText:title];
  [alert setInformativeText:message];
  [alert addButtonWithTitle:"OK"];
  [alert runModal];
}

function UI() {
  UI.prototype.exportPages = function(context) {
    var pages = api.getPages();

    if(pages) {
      //user logged
      ui.onChoosePage(pages, context);
    }
  }
  UI.prototype.showAlert = function(title, message, context) {
    showAlert(title, message, context);
  }

  UI.prototype.showLoginWindow = function(context, callBack) {
    var app = [NSApplication sharedApplication];

    COScript.currentCOScript().setShouldKeepAround_(true);

    var delegate = new MochaJSDelegate();

    var webviewWindow = [[NSWindow alloc] init];
    [webviewWindow setFrame:NSMakeRect(0, 0, 500, 580) display:false];

    var frame = NSMakeRect(0,60,500,500);
    var url = [NSURL URLWithString:path + "ui/login"];
    var webView = [[WebView alloc] initWithFrame:frame];

    [webView setHidden: true];
    [[webView mainFrame] loadRequest:[NSURLRequest requestWithURL:url]];
    [[webviewWindow contentView] addSubview:webView];

    var indicator = [[[NSProgressIndicator alloc] initWithFrame:NSMakeRect(0, 0, 500, 500)] autorelease];
    [indicator setStyle:NSProgressIndicatorSpinningStyle];

    [[webviewWindow contentView] addSubview:indicator];

    function showSpinner() {
      [webView setHidden: true];
      [indicator setHidden: false];
      [indicator startAnimation:indicator];
    }

    function hideSpinner() {
      [webView setHidden: false];
      [indicator setHidden: true];
      [indicator stopAnimation:indicator];
    }

    function closeWindow() {
      [webView close];
      [webviewWindow orderOut:nil];
      [[app mainWindow] endSheet: webviewWindow];
      [cancelButton setCOSJSTargetFunction:undefined];
      COScript.currentCOScript().setShouldKeepAround_(false);
    }

    delegate.setHandlerForSelector("webView:didStartProvisionalLoadForFrame:", function(webView, didStartProvisionalLoadForFrame) {
      showSpinner();
    });

    var _this = this;

    delegate.setHandlerForSelector("webView:didFinishLoadForFrame:", function(webView, didFinishLoadForFrame) {
      hideSpinner();
      var url = didFinishLoadForFrame.dataSource().request().URL().absoluteString();
      if(url.hasPrefix(path+"ui/login?caravel-token=")) {
        var StringUrl = String(url);
        var lengthCheck = (path+"ui/login?caravel-token=").length;
        if(lengthCheck < StringUrl.length) {
          var token = url.substringFromIndex(lengthCheck);
          api.setToken(token);
          closeWindow();

          log("show page popup")
          log(callBack);
          if(callBack) {
            log("on show export page")
            _this.exportPages(context);
          }
        }
      }
    });

     delegate.setHandlerForSelector("webView:didFailLoadWithError:forFrame:", function(webView, didFailLoadWithError, forFrame) {
      hideSpinner();
    });

    webView.setFrameLoadDelegate_(delegate.getClassInstance());
    webView.setResourceLoadDelegate_(delegate.getClassInstance());

    var cancelButton = [[NSButton alloc] initWithFrame:NSMakeRect(0, 0, 0, 0)];
    [cancelButton setAction:"callAction:"];
    [cancelButton setTitle:"Cancel"];
    [cancelButton setBezelStyle:NSRoundedBezelStyle];
    [cancelButton sizeToFit];
    [cancelButton setFrame:NSMakeRect(380, 14, 100, 30)];
    [cancelButton setKeyEquivalent:@"\033"];
    [cancelButton setCOSJSTargetFunction:function(sender) {
      closeWindow();
    }]

    [[webviewWindow contentView] addSubview:cancelButton];

    [[app mainWindow] beginSheet:webviewWindow completionHandler:nil];
  }

  UI.prototype.showLogoutWindow = function(context) {
      var app = [NSApplication sharedApplication];

        COScript.currentCOScript().setShouldKeepAround_(true);

        var logoutWindow = [[NSWindow alloc] init];
        [logoutWindow setFrame:NSMakeRect(0, 0, 400, 200) display: false];

        var headerView = [[NSView alloc] initWithFrame:NSMakeRect(0, 120, 400, 60)];
        [headerView setWantsLayer:true];
        [headerView setBackgroundColor:[NSColor whiteColor]];
        [[logoutWindow contentView] addSubview:headerView];

        var titleField = createLabel("Log out of Caravel", 15, false, NSMakeRect(45, 15, 250, 25));
        [titleField setFont:[NSFont boldSystemFontOfSize:14]];
        [headerView addSubview:titleField];

        [[logoutWindow contentView] addSubview:headerView];

        function closePopup() {
          [logoutWindow orderOut:nil];
          [[app mainWindow] endSheet: logoutWindow];
          [cancelButton setCOSJSTargetFunction:undefined];
          [logoutButton setCOSJSTargetFunction:undefined];
          COScript.currentCOScript().setShouldKeepAround_(false);
        }

        var logoutButton = createButton("Logout", true, NSMakeRect(255, 8, 100, 30));
        [logoutButton setAction:"callAction:"];
        [logoutButton setCOSJSTargetFunction:function(sender) {
          api.setToken(nil);
          closePopup();
        }];

        var cancelButton = createButton("Cancel", true, NSMakeRect(152, 8, 100, 30));
        [cancelButton setAction:"callAction:"];
        [cancelButton setCOSJSTargetFunction:function(sender) {
          closePopup();
        }];

        var bottomActionsView = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 450, 50)];
        [bottomActionsView setWantsLayer:true];

        [[logoutWindow contentView] addSubview:bottomActionsView];

        [bottomActionsView addSubview:logoutButton];
        [bottomActionsView addSubview:cancelButton];

        [[app mainWindow] beginSheet:logoutWindow completionHandler:nil];
  }

  UI.prototype.onChoosePage = function(projects, context) {
    var app = [NSApplication sharedApplication];

    COScript.currentCOScript().setShouldKeepAround_(true);

    var delegate = new MochaJSDelegate();

    var exportWindow = [[NSWindow alloc] init];
    [exportWindow setFrame:NSMakeRect(0, 0, 470, 406) display: false];

    var headerView = [[NSView alloc] initWithFrame:NSMakeRect(0, 328, 470, 60)];
    [headerView setWantsLayer:true];
    [headerView setBackgroundColor:[NSColor whiteColor]];
    [[exportWindow contentView] addSubview:headerView];

    var titleField = createLabel("Sync artboards with Caravel", 15, false, NSMakeRect(45, 15, 300, 25));
    [titleField setFont:[NSFont boldSystemFontOfSize:14]];
    [headerView addSubview:titleField];

    var projectsLabel = createLabel("Projects", 12, false, NSMakeRect(45, 278, 385, 25));
    [[exportWindow contentView] addSubview:projectsLabel];

    var projectsField = [[NSComboBox alloc] initWithFrame: NSMakeRect(45, 260, 250, 25)];
    [projectsField setCompletes:true];
    [[exportWindow contentView] addSubview:projectsField];

    var sectionsLabel = createLabel("Sections", 12, false, NSMakeRect(45, 225, 385, 25));
    [[exportWindow contentView] addSubview:sectionsLabel];

    var sectionsField = [[NSComboBox alloc] initWithFrame: NSMakeRect(45, 207, 250, 25)];
    [[exportWindow contentView] addSubview:sectionsField];

    var pagesLabel = createLabel("Pages", 12, false, NSMakeRect(45, 170, 385, 25));
    [[exportWindow contentView] addSubview:pagesLabel];

    var pagesField = [[NSComboBox alloc] initWithFrame: NSMakeRect(45, 152, 250, 25)];
    [[exportWindow contentView] addSubview:pagesField];

    //default function
    var projectSelected = nil;
    var sectionSelected = nil;

    var updateProjects = function() {
      var lastProjectId = api.getSetting("last-project-id");
      for(var i = 0; i < projects.length; i++) {
        var project = projects[i];
        [projectsField addItemWithObjectValue:project.project_name];

        if (lastProjectId == project.project_id) {
          [projectsField selectItemAtIndex:i];
          projectSelected = project;
          updateSections();
        }
      }

      var index = [projectsField indexOfSelectedItem];
      if(index == -1) {
        [projectsField selectItemAtIndex:0];
        projectSelected = projects[0];
        updateSections();
      }
    }

    var updateSections = function() {
      sectionsField.removeAllItems();
      var lastSectionId = api.getSetting("last-section-id");
      for(var i = 0; i < projectSelected.sections.length; i++) {
        var section = projectSelected.sections[i];
        [sectionsField addItemWithObjectValue:section.name];

        if (lastSectionId == section.id) {
          [sectionsField selectItemAtIndex:i];
          sectionSelected = section;
          updatePages();
        }
      }

      var index = [sectionsField indexOfSelectedItem];
      if(index == -1) {
        [sectionsField selectItemAtIndex:0];
        sectionSelected = projectSelected.sections[0];
        updatePages();
      }
    }

    var updatePages = function() {
      pagesField.removeAllItems();
      var lastPageId = api.getSetting("last-page-id");
      for(var i = 0; i < sectionSelected.pages.length; i++) {
        var page = sectionSelected.pages[i];
        [pagesField addItemWithObjectValue:page.name];

        if (lastPageId == page.id) {
          [pagesField selectItemAtIndex:i];
        }
      }

      var index = [pagesField indexOfSelectedItem];
      if(index == -1) {
        [pagesField selectItemAtIndex:0];
      }
    }

    //init fields
    updateProjects();


    //fields events
    var projectsFieldDelegate = new MochaJSDelegate({
      "controlTextDidChange:":(function(note) {
        boardsField.removeAllItems();
        projectSelected = nil;
      }),
      "comboBoxSelectionIsChanging:":(function(note) {
        var index = [projectsField indexOfSelectedItem];
        var project = projects[index];
        projectSelected = project;

        updateSections();
      })
    });
    [projectsField setDelegate:projectsFieldDelegate.getClassInstance()];

    var sectionsFieldDelegate = new MochaJSDelegate({
      "controlTextDidChange:":(function(note) {
        pagesField.removeAllItems();
        sectionSelected = nil;
      }),
      "comboBoxSelectionIsChanging:":(function(note) {
        var index = [sectionsField indexOfSelectedItem];
        var section = projectSelected.sections[index];
        sectionSelected = section;

        updatePages();
      })
    });
    [sectionsField setDelegate:sectionsFieldDelegate.getClassInstance()];


    var radioGroupItems = ["All the artboards on this page", "Only selected artboards on this page"];
    var radioGroup = createRadioButtons(radioGroupItems, 2, 1, NSMakeRect(45, 78, 300, 50), 300, 20);
    [[exportWindow contentView] addSubview:radioGroup];

    if(context.selection.length != 0) {
      [radioGroup selectCellWithTag:101];
    }

    var cancelButton = createButton("Cancel", true, NSMakeRect(220, 0, 100, 30));
    [cancelButton setCOSJSTargetFunction:function(sender) {
      [syncButton setCOSJSTargetFunction:undefined];
      [cancelButton setCOSJSTargetFunction:undefined];
      [exportWindow orderOut:nil];
      [[app mainWindow] endSheet: exportWindow];
      [app stopModal];
      COScript.currentCOScript().setShouldKeepAround_(false);
    }];

    [cancelButton setKeyEquivalent:@"\033"]
    [cancelButton setAction:"callAction:"];

    var syncButton = createButton("Sync", true, NSMakeRect(330, 0, 100, 30));
    [syncButton setCOSJSTargetFunction:function(sender) {
      [indicator setHidden: false];
      [indicator startAnimation:indicator];

      var index = [pagesField indexOfSelectedItem];
      var selectedTag = [[radioGroup selectedCell] tag];
      if(index == -1) {
        [indicator setHidden: true];
        [indicator stopAnimation:indicator];
        showAlert("No page is chosen", "Please choose a annotated screen that you wish to sync with your artboards.", context);
      } else {
        var exportAll = selectedTag == 100;
        var pageId = sectionSelected.pages[index].id;

        var uploadResult = api.uploadArtboards(context, pageId, exportAll);
        [indicator setHidden: true];
        [indicator stopAnimation:indicator];

        [exportWindow orderOut:nil];

        if (uploadResult == api.UploadEnum.SUCCESS) {
          api.setSetting("last-project-id", projectSelected.project_id);
          api.setSetting("last-section-id", sectionSelected.id);
          api.setSetting("last-page-id", pageId);
          [app stopModal];
          [syncButton setCOSJSTargetFunction:undefined];
          [[app mainWindow] endSheet: exportWindow];
          COScript.currentCOScript().setShouldKeepAround_(false);
          context.document.showMessage("Sync successful");

        } else if (uploadResult == api.UploadEnum.NO_ARTBOARDS) {
          showAlert("No artboards on the page?", "Please create an artboard or open another file.", context);
        } else if (uploadResult == api.UploadEnum.NO_ARTBOARDS_SELECTED) {
          showAlert("No artboards selected?", "Please choose an artboard and retry.", context);
        } else if (uploadResult == api.UploadEnum.UPLOAD_FAILED) {
          showAlert("An error occurred", "There was an error during syncing. Please retry.", context);
        }
      }
    }];

    [syncButton setKeyEquivalent:"\r"];
    [syncButton setAction:"callAction:"];

    var indicator = [[[NSProgressIndicator alloc] initWithFrame:NSMakeRect(45, 30, 20, 20)] autorelease];
    [indicator setStyle:NSProgressIndicatorSpinningStyle];
    [indicator setHidden: true];

    var bottomActionsView = [[NSView alloc] initWithFrame:NSMakeRect(0, 16, 450, 30)];
    [bottomActionsView setWantsLayer:true]
    [[exportWindow contentView] addSubview:bottomActionsView];

    [bottomActionsView addSubview:cancelButton];
    [bottomActionsView addSubview:syncButton];
    [bottomActionsView addSubview:indicator];

    [exportWindow setDefaultButtonCell:[syncButton cell]];
    [[app mainWindow] beginSheet:exportWindow completionHandler:nil];
  }
}
