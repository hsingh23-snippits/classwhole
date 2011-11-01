$(function(){

  //var block_height = 74;
  var block_height = $(".schedule-blcok").height();
  var is_dragging = false;
  var is_showing_hints = false;
  var is_updating = false;
  var handled_drop = false;

  var options = {
    draggable: {
      snap:        '.ui-droppable',
      snapMode:    'inner',
      snapTolerance: 20,
      start:       start_drag_event,
      stop:        stop_drag_event,
      revert:      true,
      revertDuration: 200,
      scope:        'section_hint',
      refreshPositions: true,
      zIndex:       1,
    },
    droppable: {
      accept:      '.ui-draggable',
      hoverClass:  'hover',
      drop:        handle_drop,
      scope:        'section_hint',
    }
  }

  function init() {

    // Setup the slidejs plugin
    $("#slides").slides({
      autoHeight: true,
      generatePagination: true
    });

    init_draggable();

  }

  function init_draggable() {
    $(".schedule-block:not(.ui-droppable)").draggable(options.draggable);
    $(".schedule-block:not(.ui-droppable)").mouseover( function(){
      if( is_showing_hints ) return;
      is_showing_hints = true;

      var current_section = $(this);
      current_section.draggable( 'option', 'revert', true );
      var section = current_section.find(".hidden").text();
      var schedule_ids = get_schedule_ids();
      //console.log( "Selected" + section );
      //console.log( schedule_ids );

      $.ajax({
        type: 'POST',
        data: { section: section, schedule:schedule_ids},
        url:  '/scheduler/move_section',
        success: function(data, textStatus, jqXHR) {
          update_schedule(data, textStatus, jqXHR, undefined);
        }
      });
    });
    
    $(".schedule-block:not(.ui-droppable)").mouseleave( function(){
      // Sometimes a mouseleave gets fired when a user is dragging
      if( is_dragging) { 
        //console.log("IS DRAGGING!");
        return; 
      }

      //console.log("REMOVING STUFF");
      is_showing_hints = false;
      $(".droppable").stop().fadeOut( 200, function() {
        $(this).remove();
      });
    });

  }

  function add_hours( num_hours ){
    var schedule = get_current_schedule();
    schedule.each( function() {
      var schedule_day = $(this).find(".schedule-day");
      var add_list = "";
      for( var i = 0; i < num_hours; i++) {
        add_list += "<li></li>";
      }
      schedule_day.append(add_list);
      //console.log(schedule_day);
      var current_height = $(".slides_control").height();
      $(".slides_control").height(current_height + block_height * num_hours);
    });
  }

  /* 
  This function removes a section from a day selector
   */
  remove_section_from_day = function( day, section_id) {
    var schedule_blocks = day.find(".schedule-block");
    for( var i = 0; i < schedule_blocks.length; i++) {
      var current_section =  $(schedule_blocks[i]);
      var current_section_id = current_section.find(".hidden").text();
      if (  section_id  == current_section_id ) {
        current_section.remove();
      }
    }
  }

  /* 
    Update schedule refreshes the schedule content with the new schedule
      from the server. It's an AJAX `success` callback function */
  function update_schedule(data, textStatus, jqXHR, day) {

    // Make sure we aren't updating the schedule when another update is in progress
    if( is_updating ) return;

    // This happens when the user stops hovering before the schedule is updated
    if( !is_showing_hints ) return; 
    is_updating = true;

    var contents = $(data).children();
    var current_schedule = get_current_schedule();

    var selected_box = $(".ui-draggable-dragging");
    var selected_section_id = selected_box.find(".hidden").text();

    // If we aren't given a position to insert the selected box, don't add 
    if( day ){
      // Move the dragndrop to an element on the page to keep it in the document
      $("#slides").append(selected_box);

      // Add the content to the page
      current_schedule.empty().append( contents );

      // Find the day of the section we're trying to add
      var current_day = current_schedule.find("." + day );

      // Remove the duplicate section given to us by the server (selected section)
      remove_section_from_day( current_day, selected_section_id);

      // Re-insert the dragndrop to the page
      current_day.append(selected_box);
    } 
    else {
      if( selected_box.length > 0) {
        //console.log("REMOVING LAME BOX");
        selected_box.draggable("destroy");
        selected_box.remove();
      }

      // Add the content to the page
      current_schedule.empty().append( contents );
    }


    // Make the hints droppable
    var section_hints = current_schedule.find(".droppable").find(".schedule-block");
    section_hints.droppable(options.droppable);

    // Make the hints undraggable
    section_hints.draggable( 'disable' );
    section_hints.css( "cursor","pointer" );

    // Adjust the height of the slides window to contain the new schedule
    var new_height = current_schedule.height();
    $('.slides_control').height( new_height );

    // Make the schedule blocks fade in
    current_schedule.find(".droppable").addClass("hidden");
    current_schedule.find(".droppable").fadeIn(450);

    // Enable the new sections to be draggable
    init_draggable();

    //console.log("Schedule updated");
    is_updating = false;
    is_dragging = false;
  }

  function insert_suggestions(data, textStatus, jqXHR) {
    var schedule = get_current_schedule();
    $(data).each( function() {
      var days_s = $(this).attr("days");
      if( typeof(days_s) != "undefined" ) {
        var days_a = days_s.split("");
        for( var i = 0; i < days_a.length; i++) {
          var schedule_day = schedule.find("." + days_a[i]);
          $(this).addClass("droppable");
          var section_hint = $(this).clone().addClass("droppable");
          section_hint.droppable( options.droppable );
          schedule_day.append(section_hint);
        }
      }
    });
  }

  function get_current_schedule() {
    var schedules = $(".schedule-wrapper");
    for( var j = 0; j < schedules.size(); j++) {
      var current = $(schedules[j]);
      if( current.css("display") == "block" ) {
        return current;
      }
    }
  }

  // scan through the currently selected schedule and build all the section ids
  function get_schedule_ids() {
    var schedule = get_current_schedule();
    var sections = [];
    var all_section_ids = schedule.find(".schedule-block .hidden");
    for( var i = 0; i < all_section_ids.size(); i++ ){
      
      // Ignore droppable sections
      if (!$(all_section_ids[i]).parent().hasClass("ui-droppable")) {
        var current_section_id = all_section_ids[i].innerHTML;

        // Make sure we don't already have the section in our array
        if( sections.indexOf(parseInt(current_section_id)) == -1 ) {
          sections.push(parseInt(current_section_id));
        }
      }
    }
    return sections.sort();
  }

  function remove_droppable( section_id ) { 
    $(".schedule-block").each( function() {
      var current_id = $(this).find(".hidden").text(); 
      if( current_id == section_id ) {
        $(this).removeClass("droppable");
      }
    });
  }

  /* Unhide the new sections */
  function setup_new_sections( section_id ) {
    get_current_schedule().find(".droppable").each( function() {
      if( $(this).find(".hidden").text() == section_id ){

        // Enable draggable for new sections
        $(this).find(".schedule-block").draggable( 'enable' );
        $(this).find(".schedule-block").removeClass("ui-droppable");

        // Disable droppable for new sections
        $(this).removeClass("droppable");
      };
    });
  }

  function handle_drop( event, ui ) {

    // Find the section that the user is holding 
    var curr_section =  $(ui.draggable[0]);
    var curr_section_id = parseInt(curr_section.find(".hidden").text());
    var new_section_id = parseInt($(this).find(".hidden").text());
    var schedule_ids = get_schedule_ids();

    // Generate the list of the new schedule to render
    var idx = schedule_ids.indexOf(curr_section_id);
    if (idx!=-1) schedule_ids.splice(idx,1);
    schedule_ids.push(new_section_id);
    schedule_ids.sort();

    //console.log(ui.draggable);
    ui.draggable.addClass( 'correct' );
    ui.draggable.draggable( 'disable' );
    $(this).droppable( 'disable' );
    ui.draggable.position( { of: $(this), my: 'left top', at: 'left top' } );
    ui.draggable.draggable( 'option', 'revert', false );
    ui.draggable.remove();

    //console.log( "selected: " + curr_section_id );
    //console.log( schedule_ids );

    $.ajax({
      type: 'POST',
      data: { schedule:schedule_ids},
      url:  '/scheduler/move_section',
      success: function(data, textStatus, jqXHR) {
        //curr_section.draggable( "option", "revert", "false" );
        update_schedule(data, textStatus, jqXHR, undefined);
        is_showing_hints = false;
      }
    });


  }

  function start_drag_event( event, ui ) {

    if( is_dragging) return;
    is_dragging = true;
    if( is_showing_hints) return;
    //console.log(ui);
    //console.log(event);
    var current_section = $(ui.helper[0]);
    current_section.draggable( 'option', 'revert', true );
    var section = current_section.find(".hidden").text();
    var schedule_ids = get_schedule_ids();
    //console.log( "requesting hints" );
    //console.log( section );
    //console.log( schedule_ids );
    $.ajax({
      type: 'POST',
      data: { section: section, schedule:schedule_ids},
      url:  '/scheduler/move_section',
      success: function(data, textStatus, jqXHR) {
        var day = $(ui.helper[0]).parent().attr("day");
        update_schedule(data, textStatus, jqXHR, day);
      }
    });
  }

  function stop_drag_event( event, ui ) {
    is_dragging = false;
    var droppable_timeout = 220;

    $(".droppable").stop().fadeOut( droppable_timeout, function() {
      $(this).remove();
      is_showing_hints = false;
    });

  }

  init();


});
