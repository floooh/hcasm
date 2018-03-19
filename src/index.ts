import { Tokenizer, Parser } from "./hcasm";

function hex8(byte: number) {
    return ('00' + byte.toString(16)).slice(-2).toUpperCase();
}

function hex16(byte: number) {
    return ('0000' + byte.toString(16)).slice(-4).toUpperCase();
}

let tokens = Tokenizer.Tokenize("hello: LD A,#$A0")
for (let t of tokens) {
    console.log(t.toString());
}

tokens = Tokenizer.Tokenize(`
        .org $200
hello:  di
        nop
        exx
        daa
        ei
        reti
`)
for (let t of tokens) {
    console.log(t.toString());
}
let parser = new Parser();
parser.Parse(tokens);
if (parser.HasErrors()) {
    parser.PrintErrors();
}
else {
    for (let item of parser.items) {
        let str = `${hex16(item.addr)}: `;
        for (let byte of item.bytes) {
            str += `${hex8(byte)} `;
        }
        console.log(str);
    }
}