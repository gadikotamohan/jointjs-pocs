window.undoStack = []
window.redoStack = []
window.lastKnownState  = null
$(document).on('keydown', function(event){
  if(event.ctrlKey && event.keyCode == 90) { 
    console.log("Hey! Ctrl+Z event captured!");
    var json = undoStack.pop();
    if(json != null){
      redoStack.push(json);
      graph.fromJSON(json);
    }
    event.preventDefault();
    return false;
  }
  if(event.ctrlKey && event.keyCode == 89) { 
    console.log("Hey! Ctrl+Y event captured!");
    event.preventDefault(); 
    var json = redoStack.pop();
    if(json != null){
      debugger;
      undoStack.push(json);
      graph.fromJSON(json);
    }
    return false;
  }
})

// Canvas where sape are dropped
var graph = new joint.dia.Graph,
  paper = new joint.dia.Paper({
    el: $('#drawingPane'),
    model: graph
  });

var addOrRemoveHandler = function(cell){
  var cells = this.getCells();
  undoStack.push({cells: cells.filter(function(val) { return val.id != cell.id ;}).map(function(e){return e.toJSON(); })});
}

graph.on('change:position', function(cell){
  if(this.debounced != null){
    this.debounced.cancel();
  }
  this.debounced = _.debounce(function(){
    var cells = this.getCells();
    cells = cells.filter(function(val) {
      return val.id != cell.id;
    });
    var c = cell.clone();
    c.attributes = cell.previousAttributes();
    c.id = cell.previousAttributes().id;
    cells.push(c);
    undoStack.push({cells: cells.map(function(e){ return e.toJSON(); })});    
  }, 100);
  this.debounced();
});


graph.on('change', function(cell){
  if(cell.changed.position != null){
    return;
  }
  var cells = this.getCells();
  cells = cells.filter(function(val) {
    return val.id != cell.id;
  });
  var c = cell.clone();
  c.attributes = cell.previousAttributes();
  c.id = cell.previousAttributes().id;
  cells.push(c);
  undoStack.push({cells: cells.map(function(e){return e.toJSON(); })});
});


graph.on('add', addOrRemoveHandler);

graph.on('remove', addOrRemoveHandler);

// Canvas from which you take shapes
var stencilGraph = new joint.dia.Graph,
  stencilPaper = new joint.dia.Paper({
    el: $('#toolbox'),
    model: stencilGraph,
    interactive: false
  });

var r1 = new joint.shapes.basic.Rect({
  position: {
    x: 10,
    y: 10
  },
  size: {
    width: 100,
    height: 40
  },
  attrs: {
    text: {
      text: 'Rect1'
    }
  }
});
var r2 = new joint.shapes.basic.Rect({
  position: {
    x: 10,
    y: 120
  },
  size: {
    width: 100,
    height: 40
  },
  attrs: {
    text: {
      text: 'Rect2'
    }
  }
});
stencilGraph.addCells([r1, r2]);

stencilPaper.on('cell:pointerdown', function(cellView, e, x, y) {
  $('body').append('<div id="flyPaper" style="position:fixed;z-index:100;opacity:.7;pointer-event:none;"></div>');
  var flyGraph = new joint.dia.Graph,
    flyPaper = new joint.dia.Paper({
      el: $('#flyPaper'),
      model: flyGraph,
      interactive: false
    }),
    flyShape = cellView.model.clone(),
    pos = cellView.model.position(),
    offset = {
      x: x - pos.x,
      y: y - pos.y
    };

  flyShape.position(0, 0);
  flyGraph.addCell(flyShape);
  $("#flyPaper").offset({
    left: e.pageX - offset.x,
    top: e.pageY - offset.y
  });
  $('body').on('mousemove.fly', function(e) {
    $("#flyPaper").offset({
      left: e.pageX - offset.x,
      top: e.pageY - offset.y
    });
  });
  $('body').on('mouseup.fly', function(e) {
    var x = e.pageX,
      y = e.pageY,
      target = paper.$el.offset();
    
    // Dropped over paper ?
    if (x > target.left && x < target.left + paper.$el.width() && y > target.top && y < target.top + paper.$el.height()) {
      var s = flyShape.clone();
      s.position(x - target.left - offset.x, y - target.top - offset.y);
      graph.addCell(s);
    }
    $('body').off('mousemove.fly').off('mouseup.fly');
    flyShape.remove();
    $('#flyPaper').remove();
  });
});