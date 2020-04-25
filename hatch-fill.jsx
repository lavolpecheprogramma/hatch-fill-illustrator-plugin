/*eslint-disable */
function filter(items, cb){
  var filtered = []
  for (var i = 0; i < items.length; i++) {
      if(cb(items[i])){
          filtered.push(items[i])
      }
  };
  return filtered;
}

function degreeToRadians(d){
  return d * Math.PI/180;
}

function main() {
  var doc = app.activeDocument;
  var filteredItems = [];
  var lineDistanceDefault = 2
  var lineDistance = 2
  var lineAngleDefault = 0
  var lineAngle = 0
  var minAreaDefault = 2
  var minArea = 2
  var crossLines = false
  var fillColor = new RGBColor();
  var flipY  = app.getScaleMatrix(100,-100);   
  var progBarLabel, progBar, dialog;
  fillColor.red = 0;
  fillColor.green = 0;
  fillColor.blue = 0;

  function displayDialog(){
      dialog = new Window ('dialog', "Hatch fill");
      dialog.orientation = "column";
      dialog.alignChildren =  ["fill", "center"];
      dialog.alignment = "center";

      var distanceGroup = dialog.add('group');
      distanceGroup.orientation = "row";

      var lineDistanceLabel = distanceGroup.add ("statictext", undefined, 'Line Distance (mm):');
      lineDistanceLabel.size = [125, 20];
      
      var lineDistanceText = distanceGroup.add ("edittext", undefined, lineDistanceDefault, { readonly: false });
      lineDistanceText.size = [60, 25]; 

      var degreeGroup = dialog.add('group');
      degreeGroup.orientation = "row";

      var lineAngleLabel = degreeGroup.add ("statictext", undefined, 'Line angle (degree):');
      lineAngleLabel.size = [125, 20];
      
      var lineAngleText = degreeGroup.add ("edittext", undefined, lineAngleDefault, { readonly: false });
      lineAngleText.size = [60, 25]; 

      var minAreaGroup = dialog.add('group');
      minAreaGroup.orientation = "row";

      var minAreaLabel = minAreaGroup.add ("statictext", undefined, 'Minimum area (mm):');
      minAreaLabel.size = [125, 20];
      
      var minAreaText = minAreaGroup.add ("edittext", undefined, minAreaDefault, { readonly: false });
      minAreaText.size = [60, 25];

      var crossLinesCheckbox = dialog.add("checkbox", undefined, "Cross lines");
      crossLinesCheckbox.alignment = "center";
      var progressGroup = dialog.add ('group');
      progressGroup.alignChildren =  ["fill", "left"];
      var progressPanel = progressGroup.add("panel", undefined, "Progress"); 
      progressPanel.alignChildren =  ["fill", "left"];
      progBarLabel = progressPanel.add("statictext", undefined, "0%"); 
      progBar = progressPanel.add("progressbar", undefined, 0, 100);
      progBar.enabled = true;
      var buttonGroup = dialog.add('group');
      buttonGroup.orientation = "row";
      buttonGroup.alignChildren =  ["fill", "center"];

      var cancel = buttonGroup.add('button', undefined, 'Cancel', {name: 'cancel'});
      cancel.helpTip = 'Press Esc to Close';
      var ok = buttonGroup.add('button', undefined, 'OK', {name: 'ok'});


      var labelsGroup = dialog.add('group');
      labelsGroup.orientation = "column";
      labelsGroup.alignChildren =  ["fill", "center"];
      var l = labelsGroup.add("statictext", undefined, "Alberto Parziale x :U:P:P");
      l.alignment = "center";
      labelsGroup.add("statictext", undefined, "https://github.com/lavolpecheprogramma"); 

      ok.helpTip = 'Press Enter to Run';
      ok.active = true;
      cancel.onClick = function () {
          win.close();
      }
      ok.onClick = function () {
          try {
              lineDistance = parseFloat(lineDistanceText.text);
              lineAngle = parseFloat(lineAngleText.text);
              minArea = parseFloat(minAreaText.text);
              crossLines = crossLinesCheckbox.value
              ok.active = false;
              start()
          } catch (e) {
              alert(e)
          }
          win.close();
      }

      dialog.center();
      dialog.show();
  } 
  
  function createLine(x, y, width, degree, isCrossLine){
      var line = doc.pathItems.add();

      line.setEntirePath( [[x, y], [x+width, y], [x+width, y+lineDistance], [x, lineDistance+y]] );
      line.rotate(degree, true, false, false, false, Transformation.BOTTOMLEFT)
      if(isCrossLine){
          line.transform(flipY, true, false, false, false, 0, Transformation.CENTER);
      }
      return line
  }

  function calculateTriangle(width, angle){
      var widthByDegree = (width + lineDistance*3) / Math.cos(degreeToRadians(angle));
      var heightByDegree = widthByDegree * Math.sin(degreeToRadians(angle));
      return { width: widthByDegree, height: heightByDegree, diff: widthByDegree - (width + lineDistance*3)};
  }

  function generateLinesByDegree(item, lines, degree, isCrossLines){
      var numLines = 6,
      top = item.visibleBounds[1] - lineDistance,
      left = item.visibleBounds[0] - lineDistance,
      width = item.visibleBounds[2] - item.visibleBounds[0] + (lineDistance * 2),
      height = item.visibleBounds[1] - item.visibleBounds[3] + (lineDistance * 2);

      if(degree <= 45){
          var triangle = calculateTriangle(width, degree)
          numLines += (height + triangle.height) / lineDistance;
          const diffV = lineDistance * degree/90
          for (var i = 0; i <= numLines; i+=2) {
              lines.push(createLine( left , top - (lineDistance+diffV)*i, triangle.width, degree, isCrossLines))
          }; 
      }else{
          var triangle = calculateTriangle(height, 90 - degree)
          left = left - triangle.height;
          top = top - height;
          numLines += (width + triangle.height) / lineDistance;
          const diffH = lineDistance * (degree- 45)/90
          for (var i = 0; i <= numLines; i+=2) {
              lines.push(createLine( left + (lineDistance+diffH)*i, top, triangle.width, degree, isCrossLines))
          };
      }
  }


  function traverseHelper( parent, cbs ) {
      if(parent == undefined )return
      var callbacks = cbs || {};

      if( parent.typename == 'Layer' ) {
          var layers = parent.layers;
          for( var i = 0, ii = layers.length; i < ii; i++ ) {
              traverseHelper( layers[i], callbacks );
          }
      }

      var items = parent.pageItems;

      for( var j = 0, jj = items.length; j < jj; j++ ) {
          var curItem = items[j];

          curItem.typename && callbacks[curItem.typename] && callbacks[curItem.typename](curItem, callbacks)
      }
  }

  function traverseLayers(cb) {
      var layers = doc.layers;
      
      for( var i = 0, ii = layers.length; i < ii; i++ ) {
          var curLayer = layers[i];
          if( curLayer.visible && !curLayer.locked ) {
              cb(curLayer);
          }
      }
  }

  function sort_layer (pathItems) {
      for (var ri=0, riL=pathItems.length; ri < riL ; ri++) {
          pathItems[ri].zOrder( ZOrderMethod.SENDTOBACK );
      };
  }


  function createHatch(item, isCrossLines){
      doc.selection = null;

      var lines = []
      var normDegree = lineAngle % 90;
      generateLinesByDegree(item, lines, isCrossLines ? 90 - normDegree : normDegree, isCrossLines);
      
      doc.selection = null;
      for (var i = 0; i < lines.length; i++) {
          lines[i].selected = true;
      }
      app.executeMenuCommand('compoundPath');

      doc.selection[0].pathItems[0].filled = true;
      doc.selection[0].pathItems[0].fillColor = fillColor;
      
      var itemD = item.duplicate(doc );
      itemD.selected = true;

      var originalInteractionLevel = userInteractionLevel;
      userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
      app.executeMenuCommand('group');
      app.executeMenuCommand('Live Pathfinder Intersect');
      app.executeMenuCommand('expandStyle');
      app.executeMenuCommand('ungroup');
      userInteractionLevel = originalInteractionLevel;
  }

  function start(){
      traverseLayers(function(layer){
          traverseHelper( 
              layer,
              {
                  'CompoundPathItem': function (i) { i.pathItems[0].filled && filteredItems.push(i) },
                  'PathItem': function (i) { i.filled && filteredItems.push(i) },
                  'GroupItem': function (i, callbacks) { 
                      traverseHelper( i, callbacks );
                  },
              }
          );
      });
      for (var i = 0; i < filteredItems.length; i++) {
          createHatch(filteredItems[i], false);

          if(crossLines){
              createHatch(filteredItems[i], true);
          }

          progBar.value = 100 * (i/filteredItems.length);   
          progBarLabel.text = Math.floor(progBar.value)+"%";  
          dialog.update();
      };

      app.executeMenuCommand("selectall"); 
      app.executeMenuCommand("ungroup");
      app.executeMenuCommand("noCompoundPath");
      app.executeMenuCommand("deselectall"); 
      app.redraw()

      var sortItems = []
      var toRemove = []
      traverseLayers(function(layer){
          traverseHelper( 
              layer,
              {
                  "PathItem": function (i) { 
                      if(Math.abs(i.area) < minArea){
                          toRemove.push(i)
                      }else{
                          i.stroked = true;
                          i.strokeWidth = 1;
                          i.strokeColor = fillColor;
                          i.filled = false;
                          sortItems.push(i)  
                      }
                  },
              }
          );
      });
      for (var i = toRemove.length - 1; i >= 0; i--) {
          toRemove[i].remove()
      };
      sortItems.sort(function(a,b){
          return ~~a.top == ~~b.top ? ~~b.left - ~~a.left : ~~a.top - ~~b.top;
      })
      sort_layer(sortItems)
  }
  displayDialog();
}

main();