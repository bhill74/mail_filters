/**
 * retrieves the filtering data to be used when examaning emails
 *
 * @param {string} the directory that the settings are stored in.
 * @return {object} an object of all the filtering data.
 */
function get(name) {
  var dirs = DriveApp.getFoldersByName(name);
  var result = [];
  while (dirs.hasNext()) {
    var dir = dirs.next();
    logger = new MyLogger.create(dir.getName());
    var files = dir.searchFiles("title contains '.json'");
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName().replace(".json", "");
      var blob = file.getBlob();
      var content = blob.getDataAsString();
      var today = new Date();
      var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
      var time = today.getHours()+':'+today.getMinutes()+':'+today.getSeconds();
      logger.add("\nFrom " + file.getName() + " processed @ " + date + ' ' + time);
      var filters = processFilters_(content, logger);
      for (var i in filters) {
        var filter = filters[i];
        filter["src"] = file.getName();
        filter["name"] = name;
        logger.add("  * " + stringify(filter, 0));
        result.push(filter);
      }
    }
    
    var logFile = dir.getName() + ".log";
    files = dir.getFilesByName(logFile);
    if (files.hasNext()) {
      dir.removeFile(files.next());
    }
    dir.createFile(logFile, logger.log + "\n\nFull Set\n" + stringify(result, 4));
  }
  
  return result;
}

/**
 * processes each JSON filter for meta data and convert to 
 * regular expressions.
 *
 * @param {string} the content to parse
 * @param {object} the logger to store data
 * @return {object} the parsed data.
 */
function processFilters_(content, logger) {
  var filters = JSON.parse(content);
  for(var i in filters) {
    info = filters[i];
    if ("patterns" in info) {
      patterns = info["patterns"];
      for(type in patterns) {
        var pattern = patterns[type];
        if (typeof pattern === 'string') {
          patterns[type] = new RegExp(MetaData.expand(pattern));
        } else if (Array.isArray(pattern)) {
          if (pattern.length == 1) {
            patterns[type] = new RegExp(MetaData.expand(pattern[0]));
          } else if (pattern.length == 2) {
            patterns[type] = new RegExp(MetaData.expand(pattern[0]), pattern[1]);
          }
        }
      }
    }
  }
  
  return filters;
}

/**
 * adds the ability of a number to pad iself into a string.
 *
 * @param {integer} the number of desired digits 
 * @return {string} a string representing the value with padded zeros
 */
Number.prototype.pad = function(size) {
  var s = String(this);
  while (s.length < (size || 2)) { s = "0" + s;}
  return s;
}

/**
 * determines the timestamp of just now
 * 
 * @return {string} a string representing the timestamp
 */
function timestamp() {
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours().pad(2)+':'+today.getMinutes().pad(2)+':'+today.getSeconds().pad(2);
  return date+' '+time;
}

/**
* stringify a JSON object that has regular expressions
*
* @param {object} the object data
* @param {integer} the indenation amount for formatting
* @return {string} the resulting string
*/
function stringify(object, indent) {
  return JSON.stringify(object, function(key, value) {
      if (value instanceof RegExp) {
        return value.toString();
      }
      return value;
    }, indent);
}