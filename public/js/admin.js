$(function() {
  $('#create_trigger').click(function() {
    $('#no_triggers').hide(); //get rid of the none message 
    $('#triggers').append('<li>A trigger</li>');
  });
});