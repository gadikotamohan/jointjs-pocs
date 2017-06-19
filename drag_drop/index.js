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
  class: 'Model',
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
      text: 'Node'
    }
  }
},
{
  class: 'Model',
  id:'place1',
  size: {
    width: 100,
    height: 100
  },
  position: {
    x: 10,
    y: 100
  },
  attrs: {
    text: {text:'Some node', fill:'#000000'}
  } 
}]

var GraphView = function(leftDiv, rightDiv, toolKit){
  // Canvas where sape are dropped
  var that = this;
  this.cmdManager = new CommandManager();
  this.cmdManager.push([]);

  this.graph = new joint.dia.Graph;
  this.paper = new joint.dia.Paper({
    el: $(rightDiv),
    model: that.graph
  });
  var addOrRemoveHandler = function(cell){
    var cells = this.getCells();
    that.cmdManager.push(cells.map(function(e){ return e.toJSON(); }));
  }

  this.graph.on('change', _.debounce(function(){
    var cell = arguments[0];
    var cells = this.getCells();
    cells = cells.filter(function(val) {
      return val.id != cell.id;
    });
    var c = cell.clone();
    c.attributes = cell.previousAttributes();
    cells.push(c);
    that.cmdManager.push(cells.map(function(e){ return e.toJSON(); }));
  }, 100));

  this.graph.on('add', addOrRemoveHandler);
  this.graph.on('remove', addOrRemoveHandler);

  // Canvas from which you take shapes
  this.stencilGraph = new joint.dia.Graph;
  this.stencilPaper = new joint.dia.Paper({
    el: $(leftDiv),
    model: that.stencilGraph,
    interactive: false
  });

  toolKit.forEach(function(item, index, toolKit){
    var klass = item.class;
    delete item.class;
    var r1 = new joint.shapes.devs[klass](item);
    that.stencilGraph.addCell(r1);
  });

  this.stencilPaper.on('cell:pointerdown', function(cellView, e, x, y) {
    var dim = cellView.el.getBBox();
    $('body').append('<div id="flyPaper" style="position:fixed;z-index:100;opacity:.7;pointer-event:none;"></div>');
    var flyGraph = new joint.dia.Graph,
      flyPaper = new joint.dia.Paper({
        el: $('#flyPaper'),
        model: flyGraph,
        interactive: false,
        width: dim.width,
        height: dim.height
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
        target = that.paper.$el.offset();
      
      // Dropped over paper ?
      // Simplify, try to use browser API for drag+drop
      if (x > target.left && x < target.left + that.paper.$el.width() && y > target.top && y < target.top + that.paper.$el.height()) {
        var s = flyShape.clone();
        s.position(x - target.left - offset.x, y - target.top - offset.y);
        that.graph.addCell(s);
      }
      $('body').off('mousemove.fly').off('mouseup.fly');
      flyShape.remove();
      $('#flyPaper').remove();
    });
  });

  $(document).on('keydown', function(event){
    if(event.ctrlKey && event.keyCode == 90) { 
      event.preventDefault();
      var cells = that.cmdManager.undo();
      if(cells != null){
        var state = {cells: cells};
        that.graph.fromJSON(state);      
      }
      return false;
    }
    if(event.ctrlKey && event.keyCode == 89) { 
      event.preventDefault(); 
      var cells = that.cmdManager.redo();
      if(cells != null){
        var state = {cells: cells};
        that.graph.fromJSON(state);      
      }
      return false;
    }
  })
}

new GraphView("#toolbox_graph", "#drawingPane_graph", json);