
// ADD ERROR HANDLING FOR COONSOLE.LOG & IE
if(! window.console) {
  console = { log: function(){} };
}

$(function() {

  //INIT BOOTSTRAP TOOL TIPS
  $('[data-toggle="tooltip"]').tooltip();


  $('.summary-row').click(function(element) { 

    if($(this).hasClass('summary-active')) {
      $(this).removeClass('summary-active');
      document.location.hash = '#'+$(this).find('.summary-name').text();
      $(this).find('.summary-motion').text('Off');
    } else {
      $(this).addClass('summary-active');
      document.location.hash = ''; 
      $(this).find('.summary-motion').text('On');
    }
  });

  $('.input-daterange').datepicker({
    orientation: "top auto",
    calendarWeeks: true,
    autoclose: true,
    todayHighlight: true,
    toggleActive: true
  });

  $('.img-link').click(function() {
    $('#imgModal').focus();
    $('#imgModal').find('.modal-img').attr('src', $(this).find('img').attr('src'));
  });
  
  $('.snapshot-link').click(function() {
    $('#snapShotModal').focus();
  });
  
  $('#take-picture').click(function() {
    $('body').addClass('snap');
  });
  
  $('#snapShotModal').on('hidden.bs.modal', function (e) {
    $('body').removeClass('snap')
  })
  
  $('#feed-actions-button').click(function() {
    $('#feed-images').html( $('#feed-images').html() + $('#feed-images').html() );
  });

});

