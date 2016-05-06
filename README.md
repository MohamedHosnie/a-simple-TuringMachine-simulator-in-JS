# TuringMachine
Single Tape Turing Machine Simulator

## Input Format:
1. First line should contain the number of the start state.
2. Second line should contain the numbers of end states separated by `,`.
3. Starting from the third line the transitions are listed and separated by a newline.
    1. The transition should be in the form `x,i>y,o,D`
        * `x` is the source state.
        * `i` is the input character.
        * `y` is the target state.
        * `o` is the output character.
        * `D` is the direction which should be `{ R | L | S }`
4. In the Examples folder there are text files containing valid turing machines examples.