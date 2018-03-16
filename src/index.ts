import { HCAsm, Tokenizer } from "./hcasm";
HCAsm.hello();

let t = new Tokenizer("hello: LD A,#$A0")
while (t.next()) {
    console.log(t.token.toString());
}
console.log('----')
t = new Tokenizer("      ");
while (t.next()) {
    console.log(t.token.toString());
}
console.log('----')
t = new Tokenizer(`
    .org $200
    .z80
bla:
    LD A,#$10
    djnz bla
`)
while (t.next()) {
    console.log(t.token.toString());
}

