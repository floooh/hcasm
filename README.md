# hcasm
8-bit home computer assembler in Typescript

## Running Tests



## Planning

```
    z80            - switch to Z80 mode
    m6502          - switch to 6502 mode
    org [expr]     - set current address
    include        - include a text file
    incbin         - include a binary file
    db [expr, ...] - define 8-bit byte(s)
    dw [expr, ...] - define 16-bit words
    const [name, expr] - define a constant
    macro [name, args...]  - define a macro
    endm                   - end current macro
    end            - end of program

label: ...          - a label


```