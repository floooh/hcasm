/**
 * this is basically the reverse of
 * https://github.com/floooh/chips-test/blob/master/tests/z80-test.c
 */
import { Tokenizer, Parser, Assembler, HCAsm } from "./hcasm";
import * as process from "process";
import chalk from "chalk";

function hex8(byte: number): string {
    return ("00" + byte.toString(16)).slice(-2).toUpperCase();
}

function hex16(byte: number): string {
    return ("0000" + byte.toString(16)).slice(-4).toUpperCase();
}

let NumErrors = 0;
let NumOk = 0;

function err(msg: string) {
    NumErrors++;
    console.log(chalk.red(msg));
}

function ok(msg: string) {
    NumOk++;
    console.log(chalk.green(msg));
}

function test(name: string, blob: Uint8Array, expected: Uint8Array) {
    const l0 = (blob === null) ? 0 : blob.length;
    const l1 = expected.length;
    if (l0 !== l1) {
        err(`${name}: output sizes don't match`);
        return;
    }
    let match = true;
    let i = 0;    
    for (i = 0; i < l0; i++) {
        if (blob[i] !== expected[i]) {
            match = false;
            break;
        }
    }
    if (match) {
        ok(`${name}: OK`);
    }
    else {
        err(`${name}: byte mismatch at index ${i}`);
        console.log("\ngot:");
        for (let i0 = 0; i0 <= i; i0++) {
            if ((i0 % 16) === 0) {
                process.stdout.write("\n");
            }
            process.stdout.write(`${hex8(blob[i0])} `);
        }
        console.log("\n\nexpected:");
        for (let i0 = 0; i0 <= i; i0++) {
            if ((i0 % 16) === 0) {
                process.stdout.write("\n");
            }
            process.stdout.write(`${hex8(expected[i0])} `);
        }
        console.log("\n");
    }
}

function LD_r_sn() {
    const outp = HCAsm.AsmRaw(`
        z80
        org $200
        ld a,$12
        ld b,a
        ld c,a
        ld d,a
        ld e,a
        ld h,a
        ld l,a
        ld a,a

        ld b,$13
        ld b,b
        ld c,b
        ld d,b
        ld e,b
        ld h,b
        ld l,b
        ld a,b

        ld c,$14
        ld b,c
        ld c,c
        ld d,c
        ld e,c
        ld h,c
        ld l,c
        ld a,c

        ld d,$15
        ld b,d
        ld c,d
        ld d,d
        ld e,d
        ld h,d
        ld l,d
        ld a,d

        ld e,$16
        ld b,e
        ld c,e
        ld d,e
        ld e,e
        ld h,e
        ld l,e
        ld a,e
        
        ld h,$17
        ld b,h
        ld c,h
        ld d,h
        ld e,h
        ld h,h
        ld l,h
        ld a,h

        ld l,$18
        ld b,l
        ld c,l
        ld d,l
        ld e,l
        ld h,l
        ld l,l
        ld a,l
    `);
    test("ld_r_sn", outp, new Uint8Array([
        0x3E, 0x12,     // LD A,0x12
        0x47,           // LD B,A
        0x4F,           // LD C,A
        0x57,           // LD D,A
        0x5F,           // LD E,A
        0x67,           // LD H,A
        0x6F,           // LD L,A
        0x7F,           // LD A,A

        0x06, 0x13,     // LD B,0x13
        0x40,           // LD B,B
        0x48,           // LD C,B
        0x50,           // LD D,B
        0x58,           // LD E,B
        0x60,           // LD H,B
        0x68,           // LD L,B
        0x78,           // LD A,B

        0x0E, 0x14,     // LD C,0x14
        0x41,           // LD B,C
        0x49,           // LD C,C
        0x51,           // LD D,C
        0x59,           // LD E,C
        0x61,           // LD H,C
        0x69,           // LD L,C
        0x79,           // LD A,C

        0x16, 0x15,     // LD D,0x15
        0x42,           // LD B,D
        0x4A,           // LD C,D
        0x52,           // LD D,D
        0x5A,           // LD E,D
        0x62,           // LD H,D
        0x6A,           // LD L,D
        0x7A,           // LD A,D

        0x1E, 0x16,     // LD E,0x16
        0x43,           // LD B,E
        0x4B,           // LD C,E
        0x53,           // LD D,E
        0x5B,           // LD E,E
        0x63,           // LD H,E
        0x6B,           // LD L,E
        0x7B,           // LD A,E

        0x26, 0x17,     // LD H,0x17
        0x44,           // LD B,H
        0x4C,           // LD C,H
        0x54,           // LD D,H
        0x5C,           // LD E,H
        0x64,           // LD H,H
        0x6C,           // LD L,H
        0x7C,           // LD A,H

        0x2E, 0x18,     // LD L,0x18
        0x45,           // LD B,L
        0x4D,           // LD C,L
        0x55,           // LD D,L
        0x5D,           // LD E,L
        0x65,           // LD H,L
        0x6D,           // LD L,L
        0x7D,           // LD A,L
    ]));
}

function LD_r_iHL() {
    const outp = HCAsm.AsmRaw(`
        z80
        org $0
        ld hl,$1000
        ld a,$33
        ld (hl),a
        ld a,$22
        ld b,(hl)
        ld c,(hl)
        ld d,(hl)
        ld e,(hl)
        ld h,(hl)
        ld h,$10
        ld l,(hl)
        ld l,0
        ld a,(hl) 
    `);
    test("ld_r_iHL", outp, new Uint8Array([
        0x21, 0x00, 0x10,   // LD HL,0x1000
        0x3E, 0x33,         // LD A,0x33
        0x77,               // LD (HL),A
        0x3E, 0x22,         // LD A,0x22
        0x46,               // LD B,(HL)
        0x4E,               // LD C,(HL)
        0x56,               // LD D,(HL)
        0x5E,               // LD E,(HL)
        0x66,               // LD H,(HL)
        0x26, 0x10,         // LD H,0x10
        0x6E,               // LD L,(HL)
        0x2E, 0x00,         // LD L,0x00
        0x7E,               // LD A,(HL)
    ]));
}

function LD_r_iIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD IX,$1003
        LD A,$12
        LD (IX+0),A
        LD B,$13
        LD (IX+1),B
        LD C,$14
        LD (IX+2),C
        LD D,$15
        LD (IX-1),D
        LD E,$16
        LD (IX-2),E
        LD H,$17
        LD (IX+3),H
        LD L,$18
        LD (IX-3),L
        LD IY,$1003
        LD A,$12
        LD (IY+0),A
        LD B,$13
        LD (IY+1),B
        LD C,$14
        LD (IY+2),C
        LD D,$15
        LD (IY-1),D
        LD E,$16
        LD (IY-2),E
        LD H,$17
        LD (IY+3),H
        LD L,$18
        LD (IY-3),L
    `);
    test("LD_r_iIXIY", outp, new Uint8Array([
        0xDD, 0x21, 0x03, 0x10,     // LD IX,0x1003
        0x3E, 0x12,                 // LD A,0x12
        0xDD, 0x77, 0x00,           // LD (IX+0),A
        0x06, 0x13,                 // LD B,0x13
        0xDD, 0x70, 0x01,           // LD (IX+1),B
        0x0E, 0x14,                 // LD C,0x14
        0xDD, 0x71, 0x02,           // LD (IX+2),C
        0x16, 0x15,                 // LD D,0x15
        0xDD, 0x72, 0xFF,           // LD (IX-1),D
        0x1E, 0x16,                 // LD E,0x16
        0xDD, 0x73, 0xFE,           // LD (IX-2),E
        0x26, 0x17,                 // LD H,0x17
        0xDD, 0x74, 0x03,           // LD (IX+3),H
        0x2E, 0x18,                 // LD L,0x18
        0xDD, 0x75, 0xFD,           // LD (IX-3),L
        0xFD, 0x21, 0x03, 0x10,     // LD IY,0x1003
        0x3E, 0x12,                 // LD A,0x12
        0xFD, 0x77, 0x00,           // LD (IY+0),A
        0x06, 0x13,                 // LD B,0x13
        0xFD, 0x70, 0x01,           // LD (IY+1),B
        0x0E, 0x14,                 // LD C,0x14
        0xFD, 0x71, 0x02,           // LD (IY+2),C
        0x16, 0x15,                 // LD D,0x15
        0xFD, 0x72, 0xFF,           // LD (IY-1),D
        0x1E, 0x16,                 // LD E,0x16
        0xFD, 0x73, 0xFE,           // LD (IY-2),E
        0x26, 0x17,                 // LD H,0x17
        0xFD, 0x74, 0x03,           // LD (IY+3),H
        0x2E, 0x18,                 // LD L,0x18
        0xFD, 0x75, 0xFD,           // LD (IY-3),L
    ]));
}

function LD_iHL_r() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1000
        LD A,$12
        LD (HL),A
        LD B,$13
        LD (HL),B
        LD C,$14
        LD (HL),C
        LD D,$15
        LD (HL),D
        LD E,$16
        LD (HL),E
        LD (HL),H
        LD (HL),L
    `);
    test("LD_iHL_r", outp, new Uint8Array([
        0x21, 0x00, 0x10,   // LD HL,0x1000
        0x3E, 0x12,         // LD A,0x12
        0x77,               // LD (HL),A
        0x06, 0x13,         // LD B,0x13
        0x70,               // LD (HL),B
        0x0E, 0x14,         // LD C,0x14
        0x71,               // LD (HL),C
        0x16, 0x15,         // LD D,0x15
        0x72,               // LD (HL),D
        0x1E, 0x16,         // LD E,0x16
        0x73,               // LD (HL),E
        0x74,               // LD (HL),H
        0x75,               // LD (HL),L}
    ]));
}

function LD_iIXIY_r() {
    // FIXME: handle (IX-d)
    const outp = HCAsm.AsmRaw(`
        LD IX,$1003
        LD A,$12
        LD (IX+0),A
        LD B,$13
        LD (IX+1),B
        LD C,$14
        LD (IX+2),C
        LD D,$15
        LD (IX-1),D
        LD E,$16
        LD (IX-2),E
        LD H,$17
        LD (IX+3),H
        LD L,$18
        LD (IX-3),L
        LD IY,$1003
        LD A,$12
        LD (IY+0),A
        LD B,$13
        LD (IY+1),B
        LD C,$14
        LD (IY+2),C
        LD D,$15
        LD (IY-1),D
        LD E,$16
        LD (IY-2),E
        LD H,$17
        LD (IY+3),H
        LD L,$18
        LD (IY-3),L    
    `);
    test("LD_iIXIY_r", outp, new Uint8Array([
        0xDD, 0x21, 0x03, 0x10,     // LD IX,0x1003
        0x3E, 0x12,                 // LD A,0x12
        0xDD, 0x77, 0x00,           // LD (IX+0),A
        0x06, 0x13,                 // LD B,0x13
        0xDD, 0x70, 0x01,           // LD (IX+1),B
        0x0E, 0x14,                 // LD C,0x14
        0xDD, 0x71, 0x02,           // LD (IX+2),C
        0x16, 0x15,                 // LD D,0x15
        0xDD, 0x72, 0xFF,           // LD (IX-1),D
        0x1E, 0x16,                 // LD E,0x16
        0xDD, 0x73, 0xFE,           // LD (IX-2),E
        0x26, 0x17,                 // LD H,0x17
        0xDD, 0x74, 0x03,           // LD (IX+3),H
        0x2E, 0x18,                 // LD L,0x18
        0xDD, 0x75, 0xFD,           // LD (IX-3),L
        0xFD, 0x21, 0x03, 0x10,     // LD IY,0x1003
        0x3E, 0x12,                 // LD A,0x12
        0xFD, 0x77, 0x00,           // LD (IY+0),A
        0x06, 0x13,                 // LD B,0x13
        0xFD, 0x70, 0x01,           // LD (IY+1),B
        0x0E, 0x14,                 // LD C,0x14
        0xFD, 0x71, 0x02,           // LD (IY+2),C
        0x16, 0x15,                 // LD D,0x15
        0xFD, 0x72, 0xFF,           // LD (IY-1),D
        0x1E, 0x16,                 // LD E,0x16
        0xFD, 0x73, 0xFE,           // LD (IY-2),E
        0x26, 0x17,                 // LD H,0x17
        0xFD, 0x74, 0x03,           // LD (IY+3),H
        0x2E, 0x18,                 // LD L,0x18
        0xFD, 0x75, 0xFD,           // LD (IY-3),L
    ]));
}

function LD_iHL_n() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$2000
        LD (HL),$33
        LD HL,$1000
        LD (HL),$65    
    `);
    test("LD_iHL_n", outp, new Uint8Array([
        0x21, 0x00, 0x20,   // LD HL,0x2000
        0x36, 0x33,         // LD (HL),0x33
        0x21, 0x00, 0x10,   // LD HL,0x1000
        0x36, 0x65,         // LD (HL),0x65    
    ]));
}

function LD_iIXIY_n() {
    const outp = HCAsm.AsmRaw(`
        LD IX,$2000
        LD (IX+2),$33
        LD (IX+$FE),$11
        LD IY,$1000
        LD (IY+1),$22
        LD (IY+$FF),$44    
    `);
    test("LD_iIXIY_n", outp, new Uint8Array([
        0xDD, 0x21, 0x00, 0x20,     // LD IX,0x2000
        0xDD, 0x36, 0x02, 0x33,     // LD (IX+2),0x33
        0xDD, 0x36, 0xFE, 0x11,     // LD (IX-2),0x11
        0xFD, 0x21, 0x00, 0x10,     // LD IY,0x1000
        0xFD, 0x36, 0x01, 0x22,     // LD (IY+1),0x22
        0xFD, 0x36, 0xFF, 0x44,     // LD (IY-1),0x44x
    ]));
}

function LD_A_iBCDEnn() {
    const outp = HCAsm.AsmRaw(`
        LD BC,$1000
        LD DE,$1001
        LD A,(BC)
        LD A,(DE)
        LD A,($1002)
    `);
    test("LD_A_iBCDEnn", outp, new Uint8Array([
        0x01, 0x00, 0x10,   // LD BC,0x1000
        0x11, 0x01, 0x10,   // LD DE,0x1001
        0x0A,               // LD A,(BC)
        0x1A,               // LD A,(DE)
        0x3A, 0x02, 0x10,   // LD A,(0x1002)
    ]));
}

function LD_iBCDEnn_A() {
    const outp = HCAsm.AsmRaw(`
        LD BC,$1000
        LD DE,$1001
        LD A,$77
        LD (BC),A
        LD (DE),A
        LD ($1002),A    
    `);
    test("LD_iBCDEnn_A", outp, new Uint8Array([
        0x01, 0x00, 0x10,   // LD BC,0x1000
        0x11, 0x01, 0x10,   // LD DE,0x1001
        0x3E, 0x77,         // LD A,0x77
        0x02,               // LD (BC),A
        0x12,               // LD (DE),A
        0x32, 0x02, 0x10,   // LD (0x1002),A
    ]));
}

function LD_HLddIXIY_inn() {
    const outp = HCAsm.AsmRaw(`
        LD HL,($1000)
        LD BC,($1001)
        LD DE,($1002)
        LD SP,($1004)
        LD IX,($1005)
        LD IY,($1006)    
    `);
    test("LD_HLddIXIY_inn", outp, new Uint8Array([
        0x2A, 0x00, 0x10,           // LD HL,(0x1000)
        0xED, 0x4B, 0x01, 0x10,     // LD BC,(0x1001)
        0xED, 0x5B, 0x02, 0x10,     // LD DE,(0x1002)
        0xED, 0x7B, 0x04, 0x10,     // LD SP,(0x1004)
        0xDD, 0x2A, 0x05, 0x10,     // LD IX,(0x1005)
        0xFD, 0x2A, 0x06, 0x10,     // LD IY,(0x1006)
    ]));
}

function LD_inn_HLddIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$0201
        LD ($1000),HL
        LD BC,$1234
        LD ($1002),BC
        LD DE,$5678
        LD ($1004),DE
        LD SP,$1368
        LD ($1008),SP
        LD IX,$4321
        LD ($100A),IX
        LD IY,$8765
        LD ($100C),IY    
    `);
    test("LD_inn_HLddIXIY", outp, new Uint8Array([
        0x21, 0x01, 0x02,           // LD HL,0x0201
        0x22, 0x00, 0x10,           // LD (0x1000),HL
        0x01, 0x34, 0x12,           // LD BC,0x1234
        0xED, 0x43, 0x02, 0x10,     // LD (0x1002),BC
        0x11, 0x78, 0x56,           // LD DE,0x5678
        0xED, 0x53, 0x04, 0x10,     // LD (0x1004),DE
        0x31, 0x68, 0x13,           // LD SP,0x1368
        0xED, 0x73, 0x08, 0x10,     // LD (0x1008),SP
        0xDD, 0x21, 0x21, 0x43,     // LD IX,0x4321
        0xDD, 0x22, 0x0A, 0x10,     // LD (0x100A),IX
        0xFD, 0x21, 0x65, 0x87,     // LD IY,0x8765
        0xFD, 0x22, 0x0C, 0x10,     // LD (0x100C),IY
    ]));
}

function LD_SP_HLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1234
        LD IX,$5678
        LD IY,$9ABC
        LD SP,HL
        LD SP,IX
        LD SP,IY    
    `);
    test("LD_SP_HLIXIY", outp, new Uint8Array([
        0x21, 0x34, 0x12,           // LD HL,0x1234
        0xDD, 0x21, 0x78, 0x56,     // LD IX,0x5678
        0xFD, 0x21, 0xBC, 0x9A,     // LD IY,0x9ABC
        0xF9,                       // LD SP,HL
        0xDD, 0xF9,                 // LD SP,IX
        0xFD, 0xF9,                 // LD SP,IY
    ]));
}

function LD_IR_A() {
    const outp = HCAsm.AsmRaw(`
        LD A,$45
        LD I,A
        LD R,A    
    `);
    test("LD_IR_A", outp, new Uint8Array([
        0x3E, 0x45,     // LD A,0x45
        0xED, 0x47,     // LD I,A
        0xED, 0x4F,     // LD R,A
    ]));
}

function LD_A_RI() {
    const outp = HCAsm.AsmRaw(`
        LD A,I
        LD A,R
    `);
    test("LD_A_RI", outp, new Uint8Array([
        0xED, 0x57,         // LD A,I
        0xED, 0x5F,         // LD A,R        
    ]));
}

function ADD_rn() {
    const outp = HCAsm.AsmRaw(`
        LD A,$0F
        ADD A
        LD B,$E0
        ADD B
        LD A,$81
        LD C,$80
        ADD C
        LD D,$FF
        ADD D
        LD E,$40
        ADD E
        LD H,$80
        ADD H
        LD L,$33
        ADD L
        ADD $44    
    `);
    test("ADD_rn", outp, new Uint8Array([
        0x3E, 0x0F,     // LD A,0x0F
        0x87,           // ADD A,A
        0x06, 0xE0,     // LD B,0xE0
        0x80,           // ADD A,B
        0x3E, 0x81,     // LD A,0x81
        0x0E, 0x80,     // LD C,0x80
        0x81,           // ADD A,C
        0x16, 0xFF,     // LD D,0xFF
        0x82,           // ADD A,D
        0x1E, 0x40,     // LD E,0x40
        0x83,           // ADD A,E
        0x26, 0x80,     // LD H,0x80
        0x84,           // ADD A,H
        0x2E, 0x33,     // LD L,0x33
        0x85,           // ADD A,L
        0xC6, 0x44,     // ADD A,0x44
    ]));
}

function ADD_iHLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1000
        LD IX,$1000
        LD IY,$1003
        LD A,$00
        ADD (HL)
        ADD (IX+1)
        ADD (IY-1)    
    `);
    test("ADD_iHLIXIY", outp, new Uint8Array([
        0x21, 0x00, 0x10,       // LD HL,0x1000
        0xDD, 0x21, 0x00, 0x10, // LD IX,0x1000
        0xFD, 0x21, 0x03, 0x10, // LD IY,0x1003
        0x3E, 0x00,             // LD A,0x00
        0x86,                   // ADD A,(HL)
        0xDD, 0x86, 0x01,       // ADD A,(IX+1)
        0xFD, 0x86, 0xFF,       // ADD A,(IY-1)
    ]));
}

function ADC_rn() {
    const outp = HCAsm.AsmRaw(`
        LD A,$00
        LD B,$41
        LD C,$61
        LD D,$81
        LD E,$41
        LD H,$61
        LD L,$81
        ADC A
        ADC B
        ADC C
        ADC D
        ADC E
        ADC H
        ADC L
        ADC $01    
    `);
    test("ADC_rn", outp, new Uint8Array([
        0x3E, 0x00,         // LD A,0x00
        0x06, 0x41,         // LD B,0x41
        0x0E, 0x61,         // LD C,0x61
        0x16, 0x81,         // LD D,0x81
        0x1E, 0x41,         // LD E,0x41
        0x26, 0x61,         // LD H,0x61
        0x2E, 0x81,         // LD L,0x81
        0x8F,               // ADC A,A
        0x88,               // ADC A,B
        0x89,               // ADC A,C
        0x8A,               // ADC A,D
        0x8B,               // ADC A,E
        0x8C,               // ADC A,H
        0x8D,               // ADC A,L
        0xCE, 0x01,         // ADC A,0x01        
    ]));
}

function ADC_iHLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1000
        LD IX,$1000
        LD IY,$1003
        LD A,$00
        ADD (HL)
        ADC (IX+1)
        ADC (IY-1)
        ADC (IX+3)    
    `);
    test("ADC_iHLIXIY", outp, new Uint8Array([
        0x21, 0x00, 0x10,       // LD HL,0x1000
        0xDD, 0x21, 0x00, 0x10, // LD IX,0x1000
        0xFD, 0x21, 0x03, 0x10, // LD IY,0x1003
        0x3E, 0x00,             // LD A,0x00
        0x86,                   // ADD A,(HL)
        0xDD, 0x8E, 0x01,       // ADC A,(IX+1)
        0xFD, 0x8E, 0xFF,       // ADC A,(IY-1)
        0xDD, 0x8E, 0x03,       // ADC A,(IX+3)
    ]));
}

function SUB_rn() {
    const outp = HCAsm.AsmRaw(`
        LD A,$04
        LD B,$01
        LD C,$F8
        LD D,$0F
        LD E,$79
        LD H,$C0
        LD L,$BF
        SUB A
        SUB B
        SUB C
        SUB D
        SUB E
        SUB H
        SUB L
        SUB $01
        SUB $FE
    `);
    test("SUB_rn", outp, new Uint8Array([
        0x3E, 0x04,     // LD A,0x04
        0x06, 0x01,     // LD B,0x01
        0x0E, 0xF8,     // LD C,0xF8
        0x16, 0x0F,     // LD D,0x0F
        0x1E, 0x79,     // LD E,0x79
        0x26, 0xC0,     // LD H,0xC0
        0x2E, 0xBF,     // LD L,0xBF
        0x97,           // SUB A,A
        0x90,           // SUB A,B
        0x91,           // SUB A,C
        0x92,           // SUB A,D
        0x93,           // SUB A,E
        0x94,           // SUB A,H
        0x95,           // SUB A,L
        0xD6, 0x01,     // SUB A,0x01
        0xD6, 0xFE,     // SUB A,0xFE
    ]));
}

function SUB_iHLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1000
        LD IX,$1000
        LD IY,$1003
        LD A,$00
        SUB (HL)
        SUB (IX+1)
        SUB (IY-2)
    `);
    test("SUB_iHLIXIY", outp, new Uint8Array([
        0x21, 0x00, 0x10,       // LD HL,0x1000
        0xDD, 0x21, 0x00, 0x10, // LD IX,0x1000
        0xFD, 0x21, 0x03, 0x10, // LD IY,0x1003
        0x3E, 0x00,             // LD A,0x00
        0x96,                   // SUB A,(HL)
        0xDD, 0x96, 0x01,       // SUB A,(IX+1)
        0xFD, 0x96, 0xFE,       // SUB A,(IY-2)
    ]));
}

function CP_rn() {
    const outp = HCAsm.AsmRaw(`
        LD A,$04
        LD B,$05
        LD C,$03
        LD D,$ff
        LD E,$aa
        LD H,$80
        LD L,$7f
        CP A
        CP B
        CP C
        CP D
        CP E
        CP H
        CP L
        CP $04    
    `);
    test("CP_rn", outp, new Uint8Array([
        0x3E, 0x04,     // LD A,0x04
        0x06, 0x05,     // LD B,0x05
        0x0E, 0x03,     // LD C,0x03
        0x16, 0xff,     // LD D,0xff
        0x1E, 0xaa,     // LD E,0xaa
        0x26, 0x80,     // LD H,0x80
        0x2E, 0x7f,     // LD L,0x7f
        0xBF,           // CP A
        0xB8,           // CP B
        0xB9,           // CP C
        0xBA,           // CP D
        0xBB,           // CP E
        0xBC,           // CP H
        0xBD,           // CP L
        0xFE, 0x04,     // CP 0x04        
    ]));
}

function CP_iHLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1000
        LD IX,$1000
        LD IY,$1003
        LD A,$41
        CP (HL)
        CP (IX+1)
        CP (IY-1)    
    `);
    test("CP_iHLIXIY", outp, new Uint8Array([
        0x21, 0x00, 0x10,       // LD HL,0x1000
        0xDD, 0x21, 0x00, 0x10, // LD IX,0x1000
        0xFD, 0x21, 0x03, 0x10, // LD IY,0x1003
        0x3E, 0x41,             // LD A,0x41
        0xBE,                   // CP (HL)
        0xDD, 0xBE, 0x01,       // CP (IX+1)
        0xFD, 0xBE, 0xFF,       // CP (IY-1)
    ]));
}

function SBC_rn() {
    const outp = HCAsm.AsmRaw(`
        LD A,$04
        LD B,$01
        LD C,$F8
        LD D,$0F
        LD E,$79
        LD H,$C0
        LD L,$BF
        SUB A
        SBC B
        SBC C
        SBC D
        SBC E
        SBC H
        SBC L
        SBC $01
        SBC $FE    
    `);
    test("SBC_rn", outp, new Uint8Array([
        0x3E, 0x04,     // LD A,0x04
        0x06, 0x01,     // LD B,0x01
        0x0E, 0xF8,     // LD C,0xF8
        0x16, 0x0F,     // LD D,0x0F
        0x1E, 0x79,     // LD E,0x79
        0x26, 0xC0,     // LD H,0xC0
        0x2E, 0xBF,     // LD L,0xBF
        0x97,           // SUB A,A
        0x98,           // SBC A,B
        0x99,           // SBC A,C
        0x9A,           // SBC A,D
        0x9B,           // SBC A,E
        0x9C,           // SBC A,H
        0x9D,           // SBC A,L
        0xDE, 0x01,     // SBC A,0x01
        0xDE, 0xFE,     // SBC A,0xFE
    ]));
}

function SBC_iHLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1000
        LD IX,$1000
        LD IY,$1003
        LD A,$00
        SBC (HL)
        SBC (IX+1)
        SBC (IY-2)    
    `);
    test("SBC_iHLIXIY", outp, new Uint8Array([
        0x21, 0x00, 0x10,       // LD HL,0x1000
        0xDD, 0x21, 0x00, 0x10, // LD IX,0x1000
        0xFD, 0x21, 0x03, 0x10, // LD IY,0x1003
        0x3E, 0x00,             // LD A,0x00
        0x9E,                   // SBC A,(HL)
        0xDD, 0x9E, 0x01,       // SBC A,(IX+1)
        0xFD, 0x9E, 0xFE,       // SBC A,(IY-2)
    ]));
}

function OR_rn() {
    const outp = HCAsm.AsmRaw(`
        SUB A
        LD B,$01
        LD C,$02
        LD D,$04
        LD E,$08
        LD H,$10
        LD L,$20
        OR A
        OR B
        OR C
        OR D
        OR E
        OR H
        OR L
        OR $40
        OR $80    
    `);
    test("OR_rn", outp, new Uint8Array([
        0x97,           // SUB A
        0x06, 0x01,     // LD B,0x01
        0x0E, 0x02,     // LD C,0x02
        0x16, 0x04,     // LD D,0x04
        0x1E, 0x08,     // LD E,0x08
        0x26, 0x10,     // LD H,0x10
        0x2E, 0x20,     // LD L,0x20
        0xB7,           // OR A
        0xB0,           // OR B
        0xB1,           // OR C
        0xB2,           // OR D
        0xB3,           // OR E
        0xB4,           // OR H
        0xB5,           // OR L
        0xF6, 0x40,     // OR 0x40
        0xF6, 0x80,     // OR 0x80
    ]));
}

function XOR_rn() {
    const outp = HCAsm.AsmRaw(`
        SUB A
        LD B,$01
        LD C,$03
        LD D,$07
        LD E,$0F
        LD H,$1F
        LD L,$3F
        XOR A
        XOR B
        XOR C
        XOR D
        XOR E
        XOR H
        XOR L
        XOR $7F
        XOR $FF
    `);
    test("XOR_rn", outp, new Uint8Array([
        0x97,           // SUB A
        0x06, 0x01,     // LD B,0x01
        0x0E, 0x03,     // LD C,0x03
        0x16, 0x07,     // LD D,0x07
        0x1E, 0x0F,     // LD E,0x0F
        0x26, 0x1F,     // LD H,0x1F
        0x2E, 0x3F,     // LD L,0x3F
        0xAF,           // XOR A
        0xA8,           // XOR B
        0xA9,           // XOR C
        0xAA,           // XOR D
        0xAB,           // XOR E
        0xAC,           // XOR H
        0xAD,           // XOR L
        0xEE, 0x7F,     // XOR 0x7F
        0xEE, 0xFF,     // XOR 0xFF
    ]));
}

function OR_XOR_iHLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD A,$00
        LD HL,$1000
        LD IX,$1000
        LD IY,$1003
        OR (HL)
        OR (IX+1)
        OR (IY-1)
        XOR (HL)
        XOR (IX+1)
        XOR (IY-1)
    `);
    test("OR_XOR_iHLIXIY", outp, new Uint8Array([
        0x3E, 0x00,                 // LD A,0x00
        0x21, 0x00, 0x10,           // LD HL,0x1000
        0xDD, 0x21, 0x00, 0x10,     // LD IX,0x1000
        0xFD, 0x21, 0x03, 0x10,     // LD IY,0x1003
        0xB6,                       // OR (HL)
        0xDD, 0xB6, 0x01,           // OR (IX+1)
        0xFD, 0xB6, 0xFF,           // OR (IY-1)
        0xAE,                       // XOR (HL)
        0xDD, 0xAE, 0x01,           // XOR (IX+1)
        0xFD, 0xAE, 0xFF,           // XOR (IY-1)
    ]));
}

function AND_rn() {
    const outp = HCAsm.AsmRaw(`
        LD A,$FF
        LD B,$01
        LD C,$03
        LD D,$04
        LD E,$08
        LD H,$10
        LD L,$20
        AND B
        OR $FF
        AND C
        OR $FF
        AND D
        OR $FF
        AND E
        OR $FF
        AND H
        OR $FF
        AND L
        OR $FF
        AND $40
        OR $FF
        AND $AA
    `);
    test("AND_rn", outp, new Uint8Array([
        0x3E, 0xFF,             // LD A,0xFF
        0x06, 0x01,             // LD B,0x01
        0x0E, 0x03,             // LD C,0x03
        0x16, 0x04,             // LD D,0x04
        0x1E, 0x08,             // LD E,0x08
        0x26, 0x10,             // LD H,0x10
        0x2E, 0x20,             // LD L,0x20
        0xA0,                   // AND B
        0xF6, 0xFF,             // OR 0xFF
        0xA1,                   // AND C
        0xF6, 0xFF,             // OR 0xFF
        0xA2,                   // AND D
        0xF6, 0xFF,             // OR 0xFF
        0xA3,                   // AND E
        0xF6, 0xFF,             // OR 0xFF
        0xA4,                   // AND H
        0xF6, 0xFF,             // OR 0xFF
        0xA5,                   // AND L
        0xF6, 0xFF,             // OR 0xFF
        0xE6, 0x40,             // AND 0x40
        0xF6, 0xFF,             // OR 0xFF
        0xE6, 0xAA,             // AND 0xAA
    ]));
}

function AND_iHLIXIY() {
    const outp = HCAsm.AsmRaw(`
        LD HL,$1000
        LD IX,$1000
        LD IY,$1003
        LD A,$FF
        AND (HL)
        AND (IX+1)
        AND (IY-1)
    `);
    test("AND_iHLIXIY", outp, new Uint8Array([
        0x21, 0x00, 0x10,           // LD HL,0x1000
        0xDD, 0x21, 0x00, 0x10,     // LD IX,0x1000
        0xFD, 0x21, 0x03, 0x10,     // LD IY,0x1003
        0x3E, 0xFF,                 // LD A,0xFF
        0xA6,                       // AND (HL)
        0xDD, 0xA6, 0x01,           // AND (IX+1)
        0xFD, 0xA6, 0xFF,           // AND (IY-1)
    ]));
}

LD_r_sn();
LD_r_iHL();
LD_r_iIXIY();
LD_iHL_r();
LD_iIXIY_r();
LD_iHL_n();
LD_iIXIY_n();
LD_A_iBCDEnn();
LD_iBCDEnn_A();
LD_HLddIXIY_inn();
LD_inn_HLddIXIY();
LD_SP_HLIXIY();
LD_IR_A();
LD_A_RI();
ADD_rn();
ADD_iHLIXIY();
ADC_rn();
ADC_iHLIXIY();
SUB_rn();
SUB_iHLIXIY();
CP_rn();
CP_iHLIXIY();
SBC_rn();
SBC_iHLIXIY();
OR_rn();
XOR_rn();
OR_XOR_iHLIXIY();
AND_rn();
AND_iHLIXIY();

if (NumErrors === 0) {
    console.log(chalk.green("\n\nALL TESTS OK!"));
}
else {
    console.log(chalk.red(`\n\n${NumErrors} TEST(S) FAILED!`));
}
