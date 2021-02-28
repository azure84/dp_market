var tutorial_delay = false;
(function($) {
  $('input[type=range]').each(function() {
    var forE = $(this).attr('for');
    $(forE).text(this.value);
    $(this).on('input change', function() {
      $(forE).text(this.value);
    });
  });
  $('#tutorial-enable').click(function() {
    localStorage.setItem('tutorial', true);
    changeTutorialBtn();
    checkTutorial();
  })
  $('#tutorial-disable').click(function() {
    localStorage.removeItem('tutorial');
    changeTutorialBtn();
    checkTutorial();
  })
  changeTutorialBtn();
  $(document).ready(function() {
    // logout
    $('#logout').click(function() {
      $('#logout-form').submit();
    });

    $('.dropdown-toggle').dropdown();
    $.ajax({
      method: 'GET',
      url: '/api/swal',
    }).done(function(res) {
      var success = res.success;
      var warning = res.warning;
      var info = res.info;
      var error = res.error;

      if (success && success.length) {
        Swal.fire(success[0]).then(function() {
          checkTutorial();
        });
      } else {
        checkTutorial();
      }
    })
  })
}(jQuery));

function changeTutorialBtn() {
  if (localStorage.getItem('tutorial')) {
    $('#tutorial-enable').hide();
    $('#tutorial-disable').show();
  } else {
    $('#tutorial-enable').show();
    $('#tutorial-disable').hide();
  }
}
function checkTutorial() {
  if (localStorage.getItem('tutorial') && !tutorial_delay) {
    introJs().start();
  }
}
