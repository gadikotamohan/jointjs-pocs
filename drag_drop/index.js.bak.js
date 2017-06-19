var CommandManager = function(){
  this.index = -1;
  this.stack = [];
  this.undo = function(){
    if(this.index > -1){
      this.index = this.index - 1;
    }
    var result = this.stack[this.index];
    return result;
  }
  this.redo = function(){
    if(this.index+1 == this.stack.length){
      return null;
    }
    this.index = this.index + 1;
    var state = this.stack[this.index];
    return state;
  }

  this.push = function(state){
    this.index = this.index + 1;
    this.stack.push(state)
  }
};

var json = [{
  class: 'Rect',
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
      text: ''
    }
  }
},{
  class: 'Circle',
  position: {
    x: 10,
    y: 30
  },
  size: {
    width: 100,
    height: 40
  },
  attrs: {
    text: {
      text: ''
    }
  }
}]
var cmdManager = new CommandManager();
cmdManager.push([]);

// Canvas where sape are dropped
var graph = new joint.dia.Graph,
  paper = new joint.dia.Paper({
    el: $('#drawingPane'),
    model: graph
  });


var addOrRemoveHandler = function(cell){
  var cells = this.getCells();
  cmdManager.push(cells.map(function(e){ return e.toJSON(); }));
}

graph.on('change:position', _.debounce(function(){
  var cell = arguments[0];
  var cells = this.getCells();
  cells = cells.filter(function(val) {
    return val.id != cell.id;
  });
  var c = cell.clone();
  c.attributes = cell.previousAttributes();
  cells.push(c);
  cmdManager.push(cells.map(function(e){ return e.toJSON(); }));
}, 100));


// graph.on('change', function(cell){
//   if(cell.changed.position != null){
//     return;
//   }
//   var cells = this.getCells();
//   cells = cells.filter(function(val) {
//     return val.id != cell.id;
//   });
//   var c = cell.clone();
//   c.attributes = cell.previousAttributes();
//   c.id = cell.previousAttributes().id;
//   cells.push(c);
//   undoStack.push({cells: cells.map(function(e){return e.toJSON(); })});
// });


graph.on('add', addOrRemoveHandler);

// graph.on('remove', addOrRemoveHandler);

// Canvas from which you take shapes
var stencilGraph = new joint.dia.Graph,
  stencilPaper = new joint.dia.Paper({
    el: $('#toolbox'),
    model: stencilGraph,
    interactive: false
  });

var r1 = new joint.shapes.devs.Model({
  position: {
    x: 15,
    y: 10
  },
  size: {
    width: 100,
    height: 60
  },
  attrs: {
    text: {
      text: 'Rect1'
    }
  },
  inPorts: ['in1','in2'],
  outPorts: ['out'],
  ports: {
      groups: {
          'in': {
              attrs: {
                  '.port-body': {
                      fill: '#16A085',
                      magnet: 'passive'
                  }
              }
          },
          'out': {
              attrs: {
                  '.port-body': {
                      fill: '#E74C3C'
                  }
              }
          }
      }
  }
});

var r2 = new joint.shapes.devs.Model({
  position: {
    x: 15,
    y: 120
  },
  size: {
    width: 100,
    height: 60
  },
  attrs: {
    text: {
      text: 'Rect2'
    }
  },
  inPorts: ['in1','in2'],
  outPorts: ['out'],
  ports: {
      groups: {
          'in': {
              attrs: {
                  '.port-body': {
                      fill: '#16A085',
                      magnet: 'passive'
                  }
              }
          },
          'out': {
              attrs: {
                  '.port-body': {
                      fill: '#E74C3C'
                  }
              }
          }
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
    // Simplify, try to use browser API for drag+drop
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


// $('.undo').on('click', undo);
// $('.redo').on('click', redo);
$(document).on('keydown', function(event){
  if(event.ctrlKey && event.keyCode == 90) { 
    event.preventDefault();
    var cells = cmdManager.undo();
    if(cells != null){
      var state = {cells: cells};
      graph.fromJSON(state);      
    }
    return false;
  }
  if(event.ctrlKey && event.keyCode == 89) { 
    event.preventDefault(); 
    var cells = cmdManager.redo();
    if(cells != null){
      var state = {cells: cells};
      graph.fromJSON(state);      
    }
    return false;
  }
})