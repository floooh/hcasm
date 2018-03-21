import { Tokenizer, Parser } from "./hcasm";

function hex8(byte: number) {
    return ('00' + byte.toString(16)).slice(-2).toUpperCase();
}

function hex16(byte: number) {
    return ('0000' + byte.toString(16)).slice(-4).toUpperCase();
}

let tokens = Tokenizer.Tokenize("hello: LD A,#$A0")
for (let t of tokens) {
    console.log(t.ToString());
}

tokens = Tokenizer.Tokenize(`
        org $200
hello:  di
        ld a,b
        ld b,c
        ld c,d
        ld d,e
        ld e,h
        ld h,l
        ld l,a
        ld a,$12
        ld h,%10101010
        ld a,(hl)
        LD (HL),$12
        LD A,I
        LD A,R
        LD A,(BC)
        LD A,(DE)
        LD A,(IX+45)
        LD B,(IY+$44)
        ld (iy+$55),12
        nop
        exx
        daa
        ei
        reti
`)
for (let t of tokens) {
    console.log(t.ToString());
}
let parser = new Parser();
parser.Parse(tokens);
if (parser.HasErrors()) {
    parser.PrintErrors();
}
else {
    for (let item of parser.items) {
        console.log(item.ToString());
    }
}
