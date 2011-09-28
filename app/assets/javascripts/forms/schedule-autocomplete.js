/* Might need to put this somewhere else where it makes more sense */
$(document).ready(function(){
  
  /* === List management === */

  /* Keep track of the number of classes the user is inputting */
  var class_counter = 0;
  var selected_classes = {};

  /* In order to send a list of class ids to rails, we need to silently 
     keep track of the class ids in a hidden form as well as send the size of the list */
  var add_course_id_to_form = function( course_id ) { 

    $("<input>").val(course_id)
                .attr("type", "hidden")
                .attr("name", class_counter)
                .appendTo("#hidden-course-form");

  }

  var add_course_to_list = function( event, ui ) {

    /* Prevent the autocomplete box from being filled with 
       the value of the selection. Instead, blank the input box out. */
    event.preventDefault();
    $("#autocomplete-course-list").val(""); 

    if ( ui.item ) {
      var class_id = ui.item.value;
      if( class_id in selected_classes ){
        /* return if the user as already selected the class*/
        pop_alert("error","class is already selected"); // REMOVE THIS LATER
        return;
      } else {
        selected_classes[class_id] = class_counter;
      }

      /* Append the course to the currently populated list */
      $("<li/>").text(ui.item.label).appendTo("#user-course-list ul");

      /* Add the course id to our hidden form */
      add_course_id_to_form(class_id);
      class_counter++;

      /* use a form to keep track of count */
      $("<input>").val(class_counter)
                  .attr("type", "hidden")
                  .attr("name", "size")
                  .appendTo("#hidden-course-form");
    }
  };

  /* Set up autocomplete, use a rails catalog helper function to populate data */
  $("#autocomplete-course-list").autocomplete({ 
    source: "courses/search/auto",
    minLength: 2,
    autoFocus: true,
    select: add_course_to_list,
  });

});