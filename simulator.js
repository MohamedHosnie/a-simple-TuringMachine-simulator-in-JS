
///////////////////////////////////////////////////////////////////////////////////
//The function related to animate.css for applying the animations.
///////////////////////////////////////////////////////////////////////////////////
$.fn.extend({
    animateCss: function (animationName) {
        var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
        $(this).addClass('animated ' + animationName).one(animationEnd, function() {
            $(this).removeClass('animated ' + animationName);
        });
    }
});
///////////////////////////////////////////////////////////////////////////////////


//Selfcalling function, calls itself on page load.
$(function()
{
    
    
    ///////////////////////////////////////////////////////////////////////////////////
    //Functions related to the graph drawing
    ///////////////////////////////////////////////////////////////////////////////////
    //Initializing the graph.
    var graph = new joint.dia.Graph();
    
    //Initializing the paper which is the SVG element containing the graph.
    var paper = new joint.dia.Paper({
        el: $('#paper'),
        width: '100%',
        height: '700',
        gridSize: 10,
        model: graph,
        interactive: false
    });
   
    //Graph state creation function.
    function state(label, color = '#fff') {
                
        var cell = new joint.shapes.fsa.State({
            size: { width: 55, height: 55 },
            attrs: {
                text : { 
                    text: label, 
                    fill: '#333', 
                    'font-weight': 'normal' 
                },
                'circle': {
                    fill: color,
                    stroke: '#333',
                    'stroke-width': 1.5
                }
            }
        });
        graph.addCell(cell);
        return cell;
    }
    
    //Graph link(transition) creation function.
    function link(source, target, label, vertices, color = '#333') {
        
        var cell = new joint.shapes.fsa.Arrow({
            source: { id: source.id },
            target: { id: target.id },
            labels: [{ 
                position: 0.5, 
                attrs: { 
                    text: { 
                        text: label || '', 
                        'font-weight': 'normal',
                        'font-size': '1em'
                    },
                } 
            }],
            attrs: {
                '.connection': { stroke: color, 'stroke-width': 1.4 },
                '.marker-target': { fill: 'black' }
            },
            vertices: vertices || [],
            smooth: true
        });
        graph.addCell(cell);
        return cell;
    }
    ///////////////////////////////////////////////////////////////////////////////////





    ///////////////////////////////////////////////////////////////////////////////////
    //Globals
    ///////////////////////////////////////////////////////////////////////////////////
    var $states = new Array(), $links = new Array();
    var $graph_table = new Array();
    var $start;
    var $end_states = new Array();
    var $start_right = new Array();
    var $left = new Array();
    var $current_tape_index;
    var $current_state;
    var $previous_state;
    var $old_current_state = "", $old_previous_state = "";
    var $old_tape_index;
    var $error;
    var $old_tape_head_value;
    var $trans;
    
    var $tape_view = $('#tape');
    var $default_color = "#333"; //Default color of the links and the states stroke on the graph.
    
    //Resetting all globals & resetting the graph.
    function reset_all()
    {
        $states = [];
        $links = [];
        $graph_table = [];
        $end_states = [];
        graph.clear();
        $start_right = [];
        $left = [];
        $current_tape_index = "";
        $current_state = "";
        $previous_state = "";
        $old_current_state = "";
        $old_previous_state = "";
        $old_tape_index = "";
        $error = false;
        $old_tape_head_value = "";
    }
    ///////////////////////////////////////////////////////////////////////////////////
    
    
    
    
    
    
    ///////////////////////////////////////////////////////////////////////////////////
    //Helping functions Used in the code.
    ///////////////////////////////////////////////////////////////////////////////////
    //This function generates a span which represents a single cell in the tape.
    //The function returns the span with 3 different colors based on the case;
    //Tape Head, Error or Normal
    function span(char, id, head = false){
        var $label_color;
        if($error) $label_color = "danger";
        else $label_color = "warning";
        if(head) return '<span class="label label-'+$label_color+'" id="'+id+'">'+ char +'</span>';
        return '<span class="label label-default" id="'+id+'">'+ char +'</span>';
    }
    
    //This function returns a string formatted as a transition given it's components
        //for representation purpose.
    function transition(source, input, target, output, direction) {
        return 'δ('+source+', '+input+') = ('+target+', '+output+', '+direction+')';
    }
    
    //Because the tape is infinite on both side, it is represented by 2 arrays; one for the left part
    //and the second is the right part from the start. 
    //This finction indexing both arrays, when the given index is negative (preceded by -) the index
    //is transformed to postive and used to index the left side, and if the index is 0 or positive
    //it is used to index the start_right array.
    //if the purpose of calling this function is ti edit the value assotiated with that index
    //the new value is passed as a parameter.
    function at_index(index, new_val="")
    {
        if(new_val == "") {
            if(index < 0) {
                index *= -1;
                //If the current index is empty or undefined it is being initialized with blank '□'
                if($left[index] === null || $left[index] === undefined || $left[index] === ""){
                    $left[index] = '□';
                }
                return $left[index];
            }
            else {
                //If the current index is empty or undefined it is being initialized with blank '□'
                if($start_right[index] === null || $start_right[index] === undefined || $start_right[index] === ""){
                    $start_right[index] = '□';
                }
                return $start_right[index];
            }
        }
        else {
            if(index < 0) {
                index *= -1;
                if(index == $left.length - 1)
                {
                    $left[index+1] = '□';
                }
                //Changing the value assotiated with that index.
                $left[index] = new_val;
            }
            else {
                if(index == $start_right.length - 1)
                {
                    $start_right[index+1] = '□';
                }
                //Changing the value assotiated with that index.
                $start_right[index] = new_val;
            }
        }
    } //End of at_index function

    //for each step in the simulation process the graph is updated by highlighting the current state
    //and its link with the states which the transition is made from.
    //This function updates the graph by changing the color of the state and link related to the
        //current transition, and recoloring the old state and link with the default color.
    function update_graph()
    {
        //Coloring old state and link with the default color.
        if($old_current_state !== "")
        {
            $links[$old_previous_state+"-"+$old_current_state].attr('.connection/stroke', $default_color);
            $links[$old_previous_state+"-"+$old_current_state].attr('.marker-target/fill', 'black');
            $states[$old_current_state].attr('circle/stroke', $default_color);
        }
        
        //Deciding the highlight color depending on the case; Accepted, Error or Normal
        var $highlight_color;
        if($end_states[$current_state]) $highlight_color = '#5cb85c';
        else if($error) $highlight_color = '#d9534f';
        else $highlight_color = '#f0ad4e';
        
        //Highlighting the state and link.
        $links[$previous_state+"-"+$current_state].attr('.connection/stroke', $highlight_color);
        $links[$previous_state+"-"+$current_state].attr('.marker-target/fill', $highlight_color);
        $states[$current_state].attr('circle/stroke', $highlight_color);
    }
    
    //This function updates the tape view by inserting the elements of the 2 tape arrays inside the
        //HTML tape view.
    function update_tape_view()
    {
        //Clearing the tape view.
        $tape_view.html("");
        
        //Iterating over the tape arrays.
        for(var $index = ($left.length * -1) + 1; $index < $start_right.length; $index ++)
        {
            //Coloring the current index which represents the tape head with a different color.
            if($index == $current_tape_index)
            {
                $tape_view.html(""+$tape_view.html()+span(at_index($index), $index, true));
                continue;
            }
            $tape_view.html(""+$tape_view.html()+span(at_index($index), $index));
        }
        
    }
    
    //Updating the transition field for representation purpose.
    function update_transition(source, input, target, output, direction)
    {
        //Calling the function that formats the transition, before adding it to the HTML.
        $('#transition').val(transition("Q"+source, input, "Q"+target, output, direction));
    }
    
    //The step function which takes a step on the graph everytime it's being called.
    function step()
    {
        //Saving the current states and the previous state to use them in recoloring
        //their view on the graph in the nest step.
        $old_current_state = $current_state;
        $old_previous_state = $previous_state;
        $old_tape_index = $current_tape_index;
        $old_tape_head_value = at_index($current_tape_index);
        
        //If any object is undefined return error because it means that the there is no transition
        //for the current input char.
        $previous_state = $current_state;
        if($graph_table[$current_state] === undefined || $graph_table[$current_state] === null) { $error = true; return -1; }
        $trans = $graph_table[$current_state][at_index($current_tape_index)];
        if($graph_table[$current_state][at_index($current_tape_index)] === undefined || $graph_table[$current_state][at_index($current_tape_index)] === null) { $error = true; return -1; }
        at_index($current_tape_index, $trans.output);
        
        //Moving the tape head depending on the direction of the actual transition retrieved from the graph table.
        if($trans.direction == 'R') $current_tape_index++;
        if($trans.direction == 'L') $current_tape_index--;
        if($trans.direction == 'S') /* do nothing */;
        
        //Updating the current state.
        $current_state = $trans.target;
        
        //If the state is an end state, return seccess, or accept.
        if($end_states[$current_state]) return 2;
        
        return 1; //ok { Meaning that it is a normal step no errors and no accept. }
        
    }
    
    //Disabling the simulation control buttons and the tape input.
    function disable_buttons()
    {
        
        $('#step').prop('disabled', true);
        $('#run').prop('disabled', true);
        $('#finish').prop('disabled', true);
        $('#tape_input').prop('disabled', true);
    }
    
    //This function displays the output based on the result of the current step.
    function display_output($result)
    {
        //If not generator machine (acceptor) the output is Accepted or Rejected.
        if(!$('#generator').is(':checked'))
        {
            if($result == 2) {
                //Update the transition field.
                update_transition($previous_state, $old_tape_head_value, $trans.target, $trans.output, $trans.direction);
                $('#output').html("<strong style='color: #5cb85c;'>Accepted</strong>");
            }
            else { $('#output').html("<strong>Rejected</strong>"); $error = true; }
            if($error) { $('#output_panel').animateCss('tada'); }
            else { $('#output_panel').animateCss('bounce'); }
        }
        //If generator machine the output is the data on the tape.
        else
        {
            if($result == 2) {
                //Update the transition field.
                update_transition($previous_state, $old_tape_head_value, $trans.target, $trans.output, $trans.direction);
                var $tape_output = "";
                //Copy the non-blank data on the tape.
                for(var $tindex = ($left.length * -1); $tindex < $start_right.length; $tindex++)
                {
                    var $tape_ele = at_index($tindex);
                    if($tape_ele != '□') $tape_output += $tape_ele;
                }
                $('#output').html("<strong style='color: #5cb85c;'>"+$tape_output+"</strong>");
            }
            else { $('#output').html("<strong>Error</strong>"); $error = true; }
            if($error) { $('#output_panel').animateCss('tada'); }
            else { $('#output_panel').animateCss('bounce'); }
        }
    }
    ///////////////////////////////////////////////////////////////////////////////////
    
    
    
    
    
    ///////////////////////////////////////////////////////////////////////////////////
    //Buttons click events
    ///////////////////////////////////////////////////////////////////////////////////
    //The next code is relative to the draw button. {Man it's a long story!}.
    //Draw button click event function.
    $('#draw').click(function(){        
        var $data = $('#tm_states').val(); //Getting input transitions data.
        
        //Check if the input field is not empty and if empty return.
        if($data === "" || $data === undefined || $data === null) {
            $('#tm_states').animateCss('shake');
            return;
        }
        
        //Enabling the tape input field and the start button.
        $('#tape_input').prop('disabled', false);
        $('#start').prop('disabled', false);
        
        //Disabling step & run & finish buttons.
        $('#step').prop('disabled', true);
        $('#run').prop('disabled', true);
        $('#finish').prop('disabled', true);
        
        //Resetting all globals and graph.
        reset_all();
        
        //Replacing the * char in the input data with □, and this is done because the actual char
            //is □, but because it is not found in the keyboard it is being replaced with * char 
            //in the input.
        $data = $data.replace(/\*/g, '□');
        
        //Hising the emppty paper which contains the phrase "Graph Appears Here."
        $('#empty_paper').hide();
        
        //Splitting data using the newline char to get separated lines of data.
        var $lines = $data.split('\n');
        
        //Start state is inserted in the first line.
        var $start_state = $lines[0];
        
        //End states are inserted in the second line and separated by ',' char.
        var $input_end_states = $lines[1];
        
        //Initializing the array the will hold the transitions.
        var $transitions = new Array();
        
        //Copying the transitions from the lines array.
        for(var $i = 2; $i < $lines.length; $i++)
        {
            $transitions[$i-2] = $lines[$i];
        }
        
        //Creating and adding the a start node to the graph which is a bonus node for illustration purpose.
        $start = new joint.shapes.fsa.StartState();
        graph.addCell($start);
        
        //A function that given a state that is linked to itself and returnes 2 vertices on the self loop
            //for illustration purpose.
        function findSelfLoopVertices($wanted_state)
        {                     
            var $x = $wanted_state.prop('position/x');
            var $y = $wanted_state.prop('position/y');
            
            var $vertices = new Array({'x': $x + 85, 'y': $y + 5}, {'x': $x + 85, 'y': $y + 55});
            return $vertices;
        }
        
        //For each transition in the transitions array..
        $transitions.forEach(function($transition)
        {
            //The transition in the input looks something like this: 1,a>2,b,R
            //Split the transition line using the '>' char which is the arrow representing a transition.
            var $split_transition = $transition.split('>');
            //Split the right hand side of the transition by ',' char to get it's components
            var $transition_right = $split_transition[1].split(',');
            //Split the left hand side of the transition by ',' char to get it's components
            var $transition_left = $split_transition[0].split(',');
            
            //Getting the transition components into variables.
            var $source = $transition_left[0],
                $target = $transition_right[0],
                $input  = $transition_left[1],
                $output = $transition_right[1],
                $LR     = $transition_right[2];   
                
            //The graph table holds the every state and all the transitions going from it
                //based on the input char.
            if($graph_table[$source] === null || $graph_table[$source] === undefined) {
                $graph_table[$source] = new Array(); }
            
            //Setting up the graph table for each transition.
            $graph_table[$source][$input] = { 
                target: $target,
                output: $output,
                direction: $LR
            };
            
            //The end states array is indexed with the state number and refrences to bools 
                //determining if the state is an end state or not.
            //Here it is initialized by false for all states, and it is going to be changed later.
            $end_states[$target] = false;
                
            //For every transition creating the states mensioned in it, if it is the first time
                //it is being mensioned.
            if($states[$source] === undefined || $states[$source] === null) {
                $states[$source] = state('Q'+$source);
            }
            if($states[$target] === undefined || $states[$target] === null) {
                $states[$target] = state('Q'+$target);
            }
            
            //Creating the graph link which represents a transition if the link is not already created.
            if($links[$source+"-"+$target] === null || $links[$source+"-"+$target] === undefined) {                
                $links[$source+"-"+$target] = link($states[$source], $states[$target], $input+"|"+$output+","+$LR);
                
            //If the link is already found just edit the link label adding the additional transition.
            } else {
                
                //Getting the current label on the link.
                var $label_text = $links[$source+"-"+$target].attributes.labels[0].attrs.text.text;
                
                //Editing the label by adding the additional transition to it.
                $links[$source+"-"+$target].label(0, {
                    attrs: {
                        text: { text: $label_text+"\n"+$input+"|"+$output+","+$LR }
                    }
                });
            }
            
        }); //End of the transitions for each.
        
        //Linkning the start node with the start state on the graph, which has no use in the
            //actual machine but it is only added for representation purpose.
        $links["start-"+$start_state] = link($start, $states[$start_state], "Start");
        
        //Determining the start state in the graph table.. this start state variable is taken 
            //from the output earlier.
        $graph_table['start'] = $start_state;
                
        //Reorganizing the graph using the directed graph add-on.
        joint.layout.DirectedGraph.layout(graph, 
            { 
                setLinkVertices: false, 
                rankDir: 'TB', 
                resizeClusters: true,
                edgeSep: 70,
                nodeSep: 70,
                marginX: 10,
                marginY: 10
            });
        
        //Splitting the end states using ',' char, this input_end_states variable is taken
            //from the input earlier.
        $end_states_arr = $input_end_states.split(',');
        
        //Setting the end states in the end_states array wich is initialized by false earlier.
        $end_states_arr.forEach(function($end_state_element) {
            $end_states[$end_state_element] = true;
        });
        
        //Looping over all states..
        $states.forEach(function ($state_item, $state_index){
            //Searching for the self looping states, and for each self looping state finding link vertices
                //that works on displaying the self looping link which is not displayed without those vertices.
            if(!($links[$state_index+"-"+$state_index] === null) && !($links[$state_index+"-"+$state_index] === undefined)) {
                $links[$state_index+"-"+$state_index].set('vertices', findSelfLoopVertices($states[$state_index]));
            }
            
            //In the same time changing the width of the end states to 5, that makes it bolder than normal states.
            if($end_states[$state_index]) {
                $states[$state_index].attr('circle/stroke-width', 5);
            }
        });
            
        //Fitting the SVG element paper to the graph, that makes the area of the paper on the page
            //is equal to the size of the graph.
        paper.fitToContent();
        
        //Animating the paper element with a cool fade in effect that is played at the time 
            //the graph is drawn.
        $('#paper').animateCss('fadeIn');
        
    }); //End of drawing graph function.

    //The Start button click event..
    $('#start').click(function(){
        
        //If the tape input is empty return and shake the input field.
        if($('#tape_input').val() === null || $('#tape_input').val() === undefined || $('#tape_input').val() === "") {
            $('#tape_input').animateCss('shake');
            return;
        }
        
        //Clearing the output.
        $('#output').html("");
        
        //Disabling start button and the tape input for that it's clicking 
        //can possibly result in an exception.
        $('#start').prop('disabled', true);
        $('#tape_input').prop('disabled', true);
        
        //Enabling buttons.
        $('#step').prop('disabled', false);
        $('#run').prop('disabled', false);
        $('#finish').prop('disabled', false);
        
        //Getting the value of the tape input.
        var $tape_input = $('#tape_input').val();
        
        //Inserting the whole input in the right part array of the tape.
        for(var $i = 0; $i < $tape_input.length; $i++)
        {
            $start_right[$i] = $tape_input[$i];
        }
        
        //Inserting blank char '□' on the bounds of the current tape.
        $left[$left.length+1] = '□';
        $start_right[$start_right.length] = '□';
        
        //Initialize the tape index with 0.
        $current_tape_index = 0;
        
        //Initialize the current state with the start state.
        $current_state = $graph_table['start'];
        
        //Initialize the previous state with the start node which is the 
        //black circle linked to the start state.
        $previous_state = "start";
        
        //Initial empty transition.
        $('#transition').val(transition("Qs", '*', "Q"+$current_state, "*", "*"));
        
        //Updating the tape and the graph after the Initial setup.
        update_tape_view();
        update_graph();
        
    }); //End of the Start button event handler.
    
    //The Step button click event..
    $('#step').click(function(){
        //Calling the step function
        var $result = step();
        
        //If not normal state; maybe Error or End.
        if($result != 1)
        {
            disable_buttons(); //Disable control buttons.
            display_output($result); //Display output based on the result; Error or Accept
        }
        
        //Updating the illustration tools (tape view & graph & transition field.)
        update_tape_view();
        update_graph();
        update_transition($previous_state, $old_tape_head_value, $trans.target, $trans.output, $trans.direction);
    }); //End of the Step button event handler.
    
    //The Run button click event..
    //This "Fast Run" depends on making consecutive steps with a timeout between them
    //and updating the graph and tape everytime which makes the user able to follow.
    $('#run').click(function(){
        
        var $result;
        
        //This function is called after the steps are finished.
        function after_loop()
        {
            disable_buttons(); //Disable control buttons.
            display_output($result); //Display output based on the result; Error or Accept
        }
        
        function delay_loop()
        {
            //This function plays the rule of a loop, that it is being called over and over
            //as long as there is a possible step to go.
            setTimeout(function () {
                $result = step(); //Calling the step function
                
                //Updating the illustration tools (tape view & graph & transition field.)
                update_tape_view();
                update_graph();
                if($result == 1) {
                    update_transition($previous_state, $old_tape_head_value, $trans.target, $trans.output, $trans.direction);
                    
                    delay_loop(); //Calling the function again to step another step of this step was normal, not error or accept.
                 }
                else { after_loop(); /*Calling the after loop function if Error state, of Accept state.*/ }
            }, 300 /* Number of milliseconds of delay before each step */);
        }
        
        //Plot twist: the code above starts from the next line.
        delay_loop();

    }); //End of the Run button event handler.
    
    //The Finish button click event..
    //This "Finish" depends on making consecutive steps with no wait and no representation
    //of the changes, and displaying the final output directly.
    $('#finish').click(function(){
        
        var $cstate = $current_state;
        var $pstate = $previous_state;
        
        var $result = 1;
        while($result == 1)
        {
            //Calling the step function
            $result = step();
        }
        
        $old_current_state = $cstate;
        $old_previous_state = $pstate;
        
        //Updating the illustration tools (tape view & graph.)
        update_tape_view();
        update_graph();
        
        disable_buttons(); //Disable control buttons.
        
        display_output($result); //Display output based on the result; Error or Accept
        
    });//End of the Finish button event handler.
    ///////////////////////////////////////////////////////////////////////////////////


}); //End of the self calling function.