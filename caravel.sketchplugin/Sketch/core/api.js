var api = new Api();
var path = "https://api.caravel.design/";
var appURL = "https://www.caravel.design/";
var exportPath = NSTemporaryDirectory() + "sketch-caravel-export/";

function dealWithErrors(context, message) {
  var alert = [[NSAlert alloc] init];
  [alert setMessageText: "Connection error"];

  if (message) {
    [alert setInformativeText: message];
  } else {
    [alert setInformativeText: "Please check your internet connection and retry."];
  }

  [alert runModal];
}

function removeForbiddenCharacters(string) {
  return string.replace(/[\\/,]/g, "");
}

function encodeHtmlSpecialCharacters(string) {
  return string.replace(/&/gi, '&amp;')
		.replace(/</gi, '&lt;')
		.replace(/>/gi, '&gt;')
    .split('"')
    .join('&quot;')
}

function Api() {
  Api.prototype.UploadEnum = {
    SUCCESS: 1,
    NO_ARTBOARDS: 2,
    NO_ARTBOARDS_SELECTED: 3,
    UPLOAD_FAILED: 4
  }

  Api.prototype.setContext = function(context) {
    this.context = context;
  }

  Api.prototype.setSetting = function(name, value) {
    [[NSUserDefaults standardUserDefaults] setObject:value forKey:name];
    [[NSUserDefaults standardUserDefaults] synchronize];
  }

  Api.prototype.getSetting = function(name) {
    var value = [[NSUserDefaults standardUserDefaults] objectForKey:name];

    if (value) {
      return value;
    } else {
      return false;
    }
  }

  Api.prototype.setToken = function(token) {
    this.setSetting("caravel_token", token);
  }

  Api.prototype.getToken = function() {
    return this.getSetting("caravel_token");
  }

  Api.prototype.getPages = function() {
    var result = this.request(this.context, "sketch/preview", "GET");
    return result;
  }

  Api.prototype.request = function(context, url, method, data) {
    var request = NSMutableURLRequest.new();
    [request setHTTPMethod:method];
    [request setURL:[NSURL URLWithString:path + url]];

    [request setValue:"application/json" forHTTPHeaderField:"Accept"];
    [request setValue:"application/json" forHTTPHeaderField:"Content-Type"];
    [request setValue:this.getToken() forHTTPHeaderField:"token"];

    if (data) {
      var postData = [NSJSONSerialization dataWithJSONObject:data options:NSUTF8StringEncoding error:nil];
      [request setHTTPBody:postData];
    }

    var response = [[MOPointer alloc] init];
    var error = [[MOPointer alloc] init];
    var dataResp = [NSURLConnection sendSynchronousRequest:request returningResponse:response error:error];

    if (error.value() == nil && dataResp != nil) {
      var res = [NSJSONSerialization JSONObjectWithData:dataResp options:NSJSONReadingMutableLeaves error:nil]

      if (res.code != 200) {
          api.setToken(nil);
        dealWithErrors(context, "It looks like you've been away for a while. Please login to continue.");

        return false;
      } else {
        return res.message;
      }
    } else {
      dealWithErrors(context);

      return false;
    }
  }

  Api.prototype.uploadArtboards = function(context, pageId, exportAll) {
    var exportInfoList = this.artboardsToPNG(context, exportAll);

    if (exportInfoList.length == 0) {
      var document = context.document;
      var page = [document currentPage];
      var artboards = [page artboards];

      if (artboards.length == 0) {
        return this.UploadEnum.NO_ARTBOARDS;
      } else {
        return this.UploadEnum.NO_ARTBOARDS_SELECTED;
      }
    }

    //sort by artboard name
    function compare(a,b) {
      if (a.artboardName < b.artboardName)
        return -1;
      if (a.artboardName > b.artboardName)
        return 1;
      return 0;
    }

    exportInfoList.sort(compare);

    var shortList = [];
    var maxListLength = 4;
    var returnCode;
    for (var i = 0; i < exportInfoList.length; i++) {
        shortList.push(exportInfoList[i]);

        if(shortList.length >= maxListLength) {
            returnCode = this.sentList(pageId, shortList);
            if(returnCode === this.UploadEnum.UPLOAD_FAILED) {
              shortList = [];
              break;
              return this.UploadEnum.UPLOAD_FAILED;
            }
            shortList = [];
        }
    }

    if(shortList.length != 0) {
        returnCode = this.sentList(pageId, shortList);
    }

    this.clearExportFolder();

    return returnCode;
  }

  Api.prototype.sentList = function(pageId, list) {
      var fullURL = path + "sketch/upload-artboards/" + pageId;
      var stringURL = [NSString stringWithFormat:fullURL];
      var webStringURL = [stringURL stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];

      var task = [[NSTask alloc] init];
      [task setLaunchPath:"/usr/bin/curl"];
      var args = [[NSMutableArray alloc] init];

      args.addObject("-v");
      args.addObject("POST");
      args.addObject("--header");
      args.addObject("Content-Type: multipart/form-data");
      args.addObject("--header");
      args.addObject("token: " + this.getToken());
      args.addObject("--compressed");

      for (var i = 0; i < list.length; i++) {
        args.addObject("-F");
        args.addObject(list[i]["artboardID"]+"=" + list[i]["artboardName"]);
        args.addObject("-F");
        args.addObject("artboard=@" + list[i]["path"]);
      }

      args.addObject(fullURL);

      [task setArguments:args];

      var outputPipe = [NSPipe pipe];

      [task setStandardOutput:outputPipe];
      [task launch];

      var outputData = [[outputPipe fileHandleForReading] readDataToEndOfFile];

      var classNameOfOuput = NSStringFromClass([outputData class]);

      if (classNameOfOuput != "_NSZeroData") {
          var res = [NSJSONSerialization JSONObjectWithData:outputData options:NSJSONReadingMutableLeaves error:nil]
          if (res != null) {
              if (res.error == nil) {
                  return this.UploadEnum.SUCCESS;
              }
          }
      }

      return this.UploadEnum.UPLOAD_FAILED;
  }

  Api.prototype.artboardsToPNG = function(context, exportAll) {
    var document = context.document;
    var page = [document currentPage];
    var artboards = [page artboards];
    var exportInfoList = [];

    for (var i = 0; i < artboards.length; i++) {
      if (exportAll == 1 || (artboards[i].isSelected() && exportAll == 0)) {
        var msartboard = artboards[i];
        var artboardID = [msartboard objectID];
        var artboardName = [msartboard name];
        var name = removeForbiddenCharacters(artboardName);
        var path = exportPath + artboardID + ".png";
        var format = [[MSExportFormat alloc] init];

        format.fileFormat = "png";

        var exportRequest = [[MSExportRequest exportRequestsFromExportableLayer:msartboard exportFormats:[format] useIDForName:true] firstObject];
        [document saveArtboardOrSlice:exportRequest toFile:path];

        var exportInfo = { "artboardID": artboardID, "artboardName": artboardName, "artboard": msartboard, "path": path };
        exportInfoList.push(exportInfo);
      }
    }

    return exportInfoList;
  }

  Api.prototype.clearExportFolder = function() {
    var manager = [NSFileManager defaultManager];
    [manager removeItemAtPath:exportPath error:nil];
  }
}
