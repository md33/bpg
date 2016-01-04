// $(document).ready(function() {
//   $('.drop-menu-btn').click(function() {
//     $('.menu').slideToggle();
//   });
// });
var checkDraw = false;
function initialize() {
  var mapCanvas = document.getElementById('map');
  var mapOptions = {
    center: new google.maps.LatLng(44.5403, -78.5463),
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  }
  var map = new google.maps.Map(mapCanvas, mapOptions)
}
var directionsDisplay = new google.maps.DirectionsRenderer;
var directionsService = new google.maps.DirectionsService;
var geocoder = new google.maps.Geocoder();
var map = new google.maps.Map(document.getElementById('map'), {
  zoom: 12,
  center: {lat: 47.917737, lng: 106.920597}
});
directionsDisplay.setMap(map);
var start = {lat: 47.917737, lng: 106.920597};
var end = {lat: 48.917737, lng: 107.920597};
new LongClick(map, 300);
function LongClick(map, length) {
  this.length_ = length;
  var me = this;
  me.map_ = map;
  google.maps.event.addListener(map, 'mousedown', function(e) { me.onMouseDown_(e) });
  google.maps.event.addListener(map, 'mouseup', function(e) { me.onMouseUp_(e) });
}
LongClick.prototype.onMouseUp_ = function(e) {
  var now = +new Date;
  if (now - this.down_ > this.length_) {
  google.maps.event.trigger(this.map_, 'longpress', e);
  }
}
LongClick.prototype.onMouseDown_ = function() {
  this.down_ = +new Date;
}
var lgClickCounter = 0;
var markersArray = [];
google.maps.event.addListener(map, 'longpress', function(event) {
  if(checkDraw) {
    var myLatLng = {lat: event.latLng.lat(), lng: event.latLng.lng()};
    var marker = new google.maps.Marker({
    position: myLatLng,
    map: map,
    title: 'Test'
    });
    markersArray.push(marker);
    lgClickCounter ++;
    if (lgClickCounter == 1) {
      start = myLatLng;
    }
    if (lgClickCounter == 2) {
      end = myLatLng;
      lgClickCounter = 0;
      clearOverlays();
      calculateAndDisplayRoute(directionsService, directionsDisplay);
    }
  }
});
function clearOverlays() {
  for (var i = 0; i < markersArray.length; i++ ) {
    markersArray[i].setMap(null);
  }
  markersArray.length = 0;
}
function calculateAndDisplayRoute(directionsService, directionsDisplay) {
  directionsService.route({
    origin: new google.maps.LatLng(start),
    destination: new google.maps.LatLng(end),
    travelMode: google.maps.TravelMode.WALKING
  }, 
  function(response, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
    } 
    else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}
/*
$('#addroad').click(function() {
  checkDraw = !checkDraw;
  if ($('#addroad').html() == 'Зам хадгалах') {
  $('#addroad').html('Зам тэмдэглэх');
  $('#myModal1').modal('show');
  }
  else {
  $('#addroad').html('<span class="glyphicon glyphicon-ok"></span>&nbsp;&nbsp;Зам хадгалах');
  alert('#{placeName}' + ' ' + '#{placeOriginLat}' + ' ' + '#{placeOriginLng}');
  }
  });
  $('#saveroad').click(function() {
  var data = {};
  data.name = $('#newroad').val();
  data.originLat = start.lat;
  data.originLng = start.lng;
  data.destinationLat = end.lat;
  data.destinationLng = end.lng;
  $.ajax({
    type: 'POST',
    data: JSON.stringify(data),
    contentType: 'application/json',
    url: 'http://localhost:3000/road',            
    success: function(data) {
      console.log('success');
      console.log(JSON.stringify(data));
    } 
  });
});
$('.pllnk').on('click', 'a', function(e) {
    e.preventDefault();
    $('#roadnames li a').removeClass('active');
    $(this).addClass('active');
    var url = $(this).attr('href');
    var partsArray = url.split('?');
    start = {lat: parseFloat(partsArray[0]), lng: parseFloat(partsArray[1])};
    end = {lat: parseFloat(partsArray[2]), lng: parseFloat(partsArray[3])};
    clearOverlays();
    calculateAndDisplayRoute(directionsService, directionsDisplay);
});
*/
function init() {
  $('.blind-user').html('<svg height="8" width="8"><circle cx="4" cy="4" r="4" stroke="black" stroke-width="0" fill="#33FF66"></circle></svg>&nbsp;' +  getCookie("username"));
  if(status != '') {
    alert('#{status}');  
  }
}
function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1);
      if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
  }
  return "Сонгогдоогүй";
}
