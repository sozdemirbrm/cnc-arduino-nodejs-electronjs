/* global angular */
angular.controller('main',
[ 'notify','ipc','cnc','$scope','lineTable','config','line',
( notify,ipc,cnc,$scope,lineTable,config,line) => {

// # Test doc. :START
console.log(ipc.sendSync('synchronous-message', 'ping'));
ipc.on('asynchronous-reply', (event, arg) => { console.log(arg); });
ipc.send('asynchronous-message', 'ping');
// # Test doc. :END

  $scope.cnc = cnc;
  $scope.lineTable = lineTable;
  
  ipc.send('arduino');
  ipc.on('arduino-res', (event, ardu) => {
    cnc.arduino = ardu.type === 'success' ;
    notify( ardu.code, ardu.type );
  });
  
  $scope.setFile = () => {
    var file = ipc.sendSync('open-file'); 
    if ( file.dir ){
      console.log(file);
      // Cargar Views
      // $scope.cnc.file.gcode = file.gcode;
      $scope.cnc.file.name = file.name;
      $scope.cnc.file.line.total = file.lines;
      $scope.cnc.file.line.duration = parseInt(file.segTotal);
      $scope.cnc.file.travel = file.travel;
      notify( file.name );
    }
  };
  
  $scope.enviarDatos = (cmd) => {
    if(ipc.sendArd(cmd)) notify( 'Comando manual: '+cmd , 'success' );
  }
  $scope.moverOrigen = () => {
    if(ipc.sendArd('o') )  notify( 'Comando mover al origen.' , 'success' );
  }
  $scope.pausa = () => { 
    $scope.cnc.time.pause = new Date();
    if(ipc.sendArd('p'))   notify( 'Orden de pausa' , 'warning' );
  }
  $scope.parar = () => {
    if(ipc.sendArd('0,0,0')){
      notify( 'Orden de parar' , 'success' );
      $scope.cnc.file.line.interpreted = 0;
      $scope.cnc.file.line.progress = 0;
      $scope.cnc.pause.steps[0]=0;
      $scope.cnc.pause.steps[1]=0;
      $scope.cnc.pause.steps[2]=0;
      $scope.cnc.pause.status=false;
    }
  }

  var stepsmm = 'steps';
  $scope.inputStepsmm = '200';
  $scope.btnStepsmm = 'Pasos';
  $scope.setStepsmm = () => {
    if(stepsmm === 'steps'){
      stepsmm='mm';
      $scope.btnStepsmm = 'mm';
    }else{
      stepsmm='steps';
      $scope.btnStepsmm = 'Pasos';
    }
  };
  
  $scope.moverManual = (num,eje,sentido) => {
    var cmd;
    switch (eje) {
      case "X": cmd = sentido+num+",0,0"    ; break;
      case "Y": cmd = "0,"+sentido+num+",0" ; break;
      case "Z": cmd = "0,0,"+sentido+num    ; break;
      default:  cmd = "0,0,0"               ; break;
    }
    var l =  line.codeType(cmd , stepsmm) ;
    if(ipc.sendArd( l.steps.toString()) ) {
      line.add(l);
      $scope.comando  =  '';
    }
  }
  
  ipc.on('close-conex', (event,obj) => {
    if(obj.type == 'none' && obj.data[0]==='0' && obj.data[1]==='0' && obj.data[2]==='0'){
      console.log(obj.data.toString(),'-> Emit -->> Terminado <<--');
      notify( 'Terminado: '+obj.data );
      $scope.progressBar = 'uk-progress-success';
  }else if(obj.type != 'none'){//Pause
      console.log(obj.data,'Emit -->> indefinido <<--');
      notify( 'Respuesta: '+obj.data );
      $scope.progressBar = 'uk-progress-success';
    }else{
      console.log(obj.data.line,obj.data.steps.toString(),'Emit -->> Pausado <<--');
      notify( 'Pausado: '+obj.data.steps );
      $scope.progressBar = 'uk-progress-warning';
      cnc.pause.line      =  obj.data.line ;
      cnc.pause.steps[0]  =  obj.data.steps[0];
      cnc.pause.steps[1]  =  obj.data.steps[1];
      cnc.pause.steps[2]  =  obj.data.steps[2];
      cnc.pause.status    =  true;
      $scope.comando      =  cnc.pause.steps.toString();
    }
    $scope.cnc.working = false;
  }); 
  
  ipc.on('add-line', (event, data) => { 
    //graficar gcode trabajado
    if(lineTable.length > 12) lineTable.shift();
    $scope.lineTable.push( line.new( data.line.code, data.line.ejes, undefined, data.line.travel, data.nro));
    if(data.nro && data.line.travel){
      $scope.cnc.file.Progress(data.nro,data.line.travel);
      $('title').text($scope.cnc.file.line.progress+"% - "+$scope.cnc.file.name);
    }
    //notify( line.new( data.line.code, data.line.ejes, undefined, data.line.travel, data.nro, '' ).code , 'info' );
});
    
  $scope.start = () => {
    if(cnc.file.line.total !== 0){
      if(!cnc.pause.status){
        $scope.lineTable = [];
      }else{
        $scope.cnc.pause.status = false;
        $scope.cnc.steps = [0,0,0];
        $scope.cnc.time.pause = '--:--'
        $scope.cnc.time.end = new Date(
          $scope.cnc.time.end.getTime() + $scope.cnc.time.pause.getTime()
        );
      }
      $scope.cnc.time.start = new Date();
      $scope.cnc.time.end = new Date(
        $scope.cnc.time.start.getTime() + $scope.cnc.file.line.duration
      );
      $scope.progressBar = 'uk-active';
      ipc.startArd({line:0});
    }else{
      ipc.startArd({
        line:'?',
        steps:cnc.pause.steps[0]+','+cnc.pause.steps[1]+','+cnc.pause.steps[2]
      });
    }
  }
  
}]);


    var data = null;
    var graph = null;
    // Called when the Visualization API is loaded.
    function drawVisualization() {
      // Create and populate a data table.
      data = new vis.DataSet();
      // create some nice looking data with sin/cos
      var steps = 500;
      var axisMax = 314;
      var tmax = 4 * 2 * Math.PI;
      var axisStep = axisMax / steps;
      for (var t = 0; t < tmax; t += tmax / steps) {
        var r = 1;
        var x = r * Math.sin(t);
        var y = r * Math.cos(t);
        var z = t / tmax;
        data.add({x:x,y:y,z:z});
      }
      data.add({x:0,y:0,z:-0.5});
      // specify options
      var options = {
        width:  '660px',
        height: '600px',
        style: 'line',
        showPerspective: false,
        showGrid: true,
        keepAspectRatio: true,
        verticalRatio: 1.0
      };
      // create our graph
      var container = document.getElementById('mygraph');
      graph = new vis.Graph3d(container, data, options);
      graph.setCameraPosition(0.4, undefined, undefined);
    }