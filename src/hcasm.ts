
function fatal_if(c: boolean, msg: string) {
    if (c) throw msg;
}

export enum TokenKind {
    Invalid,
    Unknown,
    Control,                // .org, ...
    Name,                   // any string
    Number,                 // a number ($ prefix for hex, % prefix for binary)
    String,                 // a string literal (everything between "")
    Label,                  // xxx:
    Comma,                  // ','
    Imm,                    // '#'
    LeftBracket,            // '('
    RightBracket,           // ')'
    Comment,                // ';' to end of line
    End                     // end of input stream
};

export function TokenKindToString(kind: TokenKind): string {
    switch (kind) {
        case TokenKind.Invalid:         return "Invalid";
        case TokenKind.Unknown:         return "Unknown";
        case TokenKind.Control:         return "Control";
        case TokenKind.Name:            return "Name";
        case TokenKind.Number:          return "Number";
        case TokenKind.String:          return "String";
        case TokenKind.Label:           return "Label";
        case TokenKind.Comma:           return "Comma";
        case TokenKind.Imm:             return "Imm";
        case TokenKind.LeftBracket:     return "LeftBracket";
        case TokenKind.RightBracket:    return "RightBracket";
        case TokenKind.Comment:         return "Comment";
        case TokenKind.End:             return "End";
    }
}

export class Token {
    kind: TokenKind = TokenKind.Invalid;
    str: string = null;
    errorDesc: string = null;
    val: number = 0;
    lineNr: number = 0;

    static newTag(kind: TokenKind, lineNr: number): Token {
        let token = new Token;
        token.kind = kind;
        token.lineNr = lineNr;
        return token;
    }

    static newName(kind: TokenKind, src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = kind;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        return token;
    }

    static newString(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.String;
        token.str = src.slice(start, end).toUpperCase().replace('\\','');
        token.lineNr = lineNr;
        return token;
    }

    static newDecimal(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.val = parseInt(token.str, 10);
        fatal_if(isNaN(token.val), `internal error: failed to parse ${token.str} as integer`);
        return token;
    }

    static newHex(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.val = parseInt(token.str, 16);
        fatal_if(isNaN(token.val), `internal error: failed to parse ${token.str} as hex`);
        return token;
    }

    static newBinary(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.val = parseInt(token.str, 2);
        fatal_if(isNaN(token.val), `internal error: failed to parse ${token.str} as binary`);
        return token;
    }

    /** return a human-readable string with the token state (for debugging) */
    toString(): string {
        if (TokenKind.Number == this.kind) {
            return `${this.lineNr}: ${ TokenKindToString(this.kind) } ${ this.val}`
        }
        else if (this.str) {
            return `${this.lineNr}: ${ TokenKindToString(this.kind) } ${ this.str }`
        }
        else {
            return `${this.lineNr}: ${ TokenKindToString(this.kind) }`
        }
    }
}

function isDecDigit(c: string): boolean {
    return c >= '0' && c <= '9';
}

function isHexDigit(c: string): boolean {
    return isDecDigit(c) || (c>='A' && c<='F') || (c>='a' && c<='f');
}

function isBinDigit(c: string): boolean {
    return (c == '0') || (c == '1');
}

function isAlnum(c: string): boolean {
    return (c>='0' && c<='9') || (c>='A' && c<='Z') || (c>='a' && c<='z');
}

function isLineEnd(c: string): boolean {
    return (c == '\n') || (c == '\r') || (c == undefined);
}

function isWhiteSpace(c: string): boolean {
    return (c == ' ') || (c == '\t') || (c == '\r');
}

/**
 * The Tokenizer takes a source code string as input and produces
 * a token stream.
 */
export class Tokenizer {
    private src: string;
    private pos: number = 0;
    private start: number = 0;
    private end: number = 0;
    private lineNr: number = 0;
    
    constructor(str: string) {
        this.src = str;
    }

    /** tokenize a string into a token array */
    static Tokenize(str: string): Array<Token> {
        let tokenizer = new Tokenizer(str);
        let tokens = new Array<Token>();
        let token = null;
        while (token = tokenizer.next_token()) {
            tokens.push(token);
        }
        return tokens;
    }

    /** return current character in input stream */
    private cur_char(): string {
        return this.src[this.pos];
    }
    /** advance character pointer, don't record into token */
    private advance_ignore() {
        this.pos++;
    }
    /** advance character pointer, record current character into token */
    private advance_take() {
        this.pos++;
        this.end++;
    }
    /** advance character pointer, set token start to next character */
    private advance_skip() {
        this.pos++;
        this.start++;
        this.end++;
    }
    /** return the next token in input character stream */
    private next_token(): Token {
        while (true) {
            this.start = this.end = this.pos;
            let c = this.cur_char();
            if (c == undefined) {
                return null;
            }
            if (c == '$') {
                this.advance_skip();
                while (isHexDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.newHex(this.src, this.start, this.end, this.lineNr);
            }
            else if (c == '%') {
                this.advance_skip();
                while (isBinDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.newBinary(this.src, this.start, this.end, this.lineNr);
            }
            else if (isDecDigit(c)) { // a decimal number
                while (isDecDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.newDecimal(this.src, this.start, this.end, this.lineNr);
            }
            else if (c == '\"') {
                this.advance_skip();
                while (this.cur_char() && (this.cur_char() != '\"')) {
                    this.advance_take();
                    // skip escape sequences
                    if (this.cur_char() == '\\') {
                        this.advance_take();
                    }
                }
                this.advance_ignore();
                return Token.newString(this.src, this.start, this.end, this.lineNr);
            }
            else if (c == ',') {
                this.advance_ignore();
                return Token.newTag(TokenKind.Comma, this.lineNr);
            }
            else if (c == '#') {
                this.advance_ignore();
                return Token.newTag(TokenKind.Imm, this.lineNr);
            }
            else if (c == '(') {
                this.advance_ignore();
                return Token.newTag(TokenKind.LeftBracket, this.lineNr);
            }
            else if (c == ')') {
                this.advance_ignore();
                return Token.newTag(TokenKind.RightBracket, this.lineNr);
            }
            else if (c == '.') {
                this.advance_skip();
                while (isAlnum(this.cur_char())) {
                    this.advance_take();
                }
                return Token.newName(TokenKind.Control, this.src, this.start, this.end, this.lineNr);
            }
            else if (c == ';') {
                while (!isLineEnd(this.cur_char())) {
                    this.advance_take();
                }
                return Token.newName(TokenKind.Comment, this.src, this.start, this.end, this.lineNr);
            }
            else if (isAlnum(c)) {
                while (isAlnum(this.cur_char())) {
                    this.advance_take();
                }
                let kind = TokenKind.Name;
                if (this.cur_char() == ':') {
                    this.advance_ignore();
                    kind = TokenKind.Label;
                }
                return Token.newName(kind, this.src, this.start, this.end, this.lineNr);
            }
            else if (c == '\n') {
                this.lineNr++;
                this.advance_ignore();
            }
            else if (isWhiteSpace(c)) {
                this.advance_ignore();
            }
            else {
                // invalid character encountered
                this.advance_ignore();
                return Token.newTag(TokenKind.Unknown, this.lineNr);
            }
        }
    }
}

enum SpanType {
    Invalid,
    Bytes,          // a raw byte sequence

    /*** Z80 instructions ***/

    /* 8-bit load group */
    Z80_LD_r_r,
    Z80_LD_r_n,
    Z80_LD_r_iHL,
    Z80_LD_r_iIXd,
    Z80_LD_r_iIYd,
    Z80_LD_iHL_r,
    Z80_LD_iIXd_r,
    Z80_LD_iIYd_r,
    Z80_LD_iHL_n,
    Z80_LD_iIXd_n,
    Z80_LD_iIYd_n,
    Z80_LD_A_iBC,
    Z80_LD_A_iDE,
    Z80_LD_A_inn,
    Z80_LD_iBC_A,
    Z80_LD_iDE_A,
    Z80_LD_inn_A,
    Z80_LD_A_I,
    Z80_LD_A_R,
    Z80_LD_I_A,
    Z80_LD_R_A,

    /* 16-bit load group */
    Z80_LD_dd_nn,
    Z80_LD_IX_nn,
    Z80_LD_IY_nn,
    Z80_LD_HL_inn,
    Z80_LD_dd_inn,
    Z80_LD_IX_inn,
    Z80_LD_IY_inn,
    Z80_LD_inn_HL,
    Z80_LD_inn_dd,
    Z80_LD_inn_IX,
    Z80_LD_inn_IY,
    Z80_LD_SP_HL,
    Z80_LD_SP_IX,
    Z80_LD_SP_IY,
    Z80_PUSH_qq,
    Z80_PUSH_IX,
    Z80_PUSH_IY,
    Z80_POP_qq,
    Z80_POP_IX,
    Z80_POP_IY,

    /* exchange, block transfer, search group */
    Z80_EX_DE_HL,
    Z80_EX_AF_AF,
    Z80_EXX,
    Z80_EX_iSP_HL,
    Z80_EX_iSP_IX,
    Z80_EX_iSP_IY,
    Z80_LDI,
    Z80_LDIR,
    Z80_LDD,
    Z80_LDDR,
    Z80_CPI,
    Z80_CPIR,
    Z80_CPD,
    Z80_CPDR,

    /* 8-bit arithmetic group */
    Z80_ADD_r,
    Z80_ADD_n,
    Z80_ADD_iHL,
    Z80_ADD_iIXd,
    Z80_ADD_iIYd,
    Z80_ADC_r,
    Z80_ADC_n,
    Z80_ADC_iHL,
    Z80_ADC_iIXd,
    Z80_ADC_iIYd,
    Z80_SUB_r,
    Z80_SUB_n,
    Z80_SUB_iHL,
    Z80_SUB_iIXd,
    Z80_SUB_iIYd,
    Z80_SBC_r,
    Z80_SBC_n,
    Z80_SBC_iHL,
    Z80_SBC_iIXd,
    Z80_SBC_iIYd,
    Z80_AND_r,
    Z80_AND_n,
    Z80_AND_iHL,
    Z80_AND_iIXd,
    Z80_AND_iIYd,
    Z80_OR_r,
    Z80_OR_n,
    Z80_OR_iHL,
    Z80_OR_iIXd,
    Z80_OR_iIYd,
    Z80_XOR_r,
    Z80_XOR_n,
    Z80_XOR_iHL,
    Z80_XOR_iIXd,
    Z80_XOR_iIYd,
    Z80_CP_r,
    Z80_CP_n,
    Z80_CP_iHL,
    Z80_CP_iIXd,
    Z80_CP_iIYd,
    Z80_INC_r,
    Z80_INC_iHL,
    Z80_INC_iIXd,
    Z80_INC_iIYd,
    Z80_DEC_r,
    Z80_DEC_iHL,
    Z80_DEC_iIXd,
    Z80_DEC_iIYd,

    /* misc */
    Z80_DAA,
    Z80_CPL,
    Z80_NEG,
    Z80_CCF,
    Z80_SCF,
    Z80_NOP,
    Z80_HALT,
    Z80_DI,
    Z80_EI,
    Z80_IM0,
    Z80_IM1,
    Z80_IM2,

    /* 16-bit arithmetic group */
    Z80_ADD_HL_ss,
    Z80_ADC_HL_ss,
    Z80_SBC_HL_ss,
    Z80_ADD_IX_pp,
    Z80_ADD_IY_pp,
    Z80_INC_ss,
    Z80_INC_IX,
    Z80_INC_IY,
    Z80_DEC_ss,
    Z80_DEC_IX,
    Z80_DEC_IY,

    /* rotate and shift group */
    Z80_RLCA,
    Z80_RLA,
    Z80_RRCA,
    Z80_RRA,
    Z80_RLC_r,
    Z80_RLC_iHL,
    Z80_RLC_iIXd,
    Z80_RLC_iIYd,
    Z80_RL_r,
    Z80_RL_iHL,
    Z80_RL_iIXd,
    Z80_RL_iIYd,
    Z80_RRC_r,
    Z80_RRC_iHL,
    Z80_RRC_iIXd,
    Z80_RRC_iIYd,
    Z80_RR_r,
    Z80_RR_iHL,
    Z80_RR_iIXd,
    Z80_RR_iIYd,
    Z80_SLA_r,
    Z80_SLA_iHL,
    Z80_SLA_iIXd,
    Z80_SLA_iIYd,
    Z80_SRA_r,
    Z80_SRA_iHL,
    Z80_SRA_iIXd,
    Z80_SRA_iIYd,
    Z80_SRL_r,
    Z80_SRL_iHL,
    Z80_SRL_iIXd,
    Z80_SRL_iIYd,
    Z80_RLD,
    Z80_RRD,

    /* bit set, reset, test group */
    Z80_BIT_b_r,
    Z80_BIT_b_iHL,
    Z80_BIT_b_iIXd,
    Z80_BIT_b_iIYd,
    Z80_SET_b_r,
    Z80_SET_b_iHL,
    Z80_SET_b_iIXd,
    Z80_SET_b_iIYd,
    Z80_RES_b_r,
    Z80_RES_b_iHL,
    Z80_RES_b_iIXd,
    Z80_RES_b_iIYd,
    
    /* jump group */
    Z80_JP_nn,
    Z80_JP_cc_nn,
    Z80_JR_e,
    Z80_JR_cc_e,
    Z80_JP_iHL,
    Z80_JP_iIX,
    Z80_JP_iIY,
    Z80_DJNZ_e,

    /* call and return group */
    Z80_CALL_nn,
    Z80_CALL_cc_nn,
    Z80_RET,
    Z80_RET_cc,
    Z80_RETI,
    Z80_RETN,
    Z80_RST_p,

    /* input/output group */
    Z80_IN_A_in,
    Z80_IN_r_iC,
    Z80_INI,
    Z80_INIR,
    Z80_IND,
    Z80_INDR,
    Z80_OUR_in_A,
    Z80_OUT_iC_r,
    Z80_OUTI,
    Z80_OTIR,
    Z80_OUTD,
    Z80_OTDR,

    // FIXME: M6502 instructions
}

enum CPU {
    Z80,
    M6502,
}

/**
 * A span is what the parser produces, basically a range of bytes
 * with semantics.
 */
export class Span {
    type: SpanType = SpanType.Invalid;
    addr: number = 0;           // 16-bit address
    label: string;              // optional label name
    bytes: Array<number>;       // the actual bytes (filled in later) 

}

export class Error {
    msg: string;
    line: number;
    constructor(msg: string, line: number) {
        this.msg = msg;
        this.line = line;
    }
}

/**
 * The Parser takes an array of tokens as input and produces 
 * an array of Span items.
 */
export class Parser {
    addr: number = 0;
    cpu: CPU = CPU.Z80;
    tokens: Array<Token>;
    index: number = 0;
    token: Token;
    items: Array<Span> = new Array<Span>();
    errors: Array<Error> = new Array<Error>();

    Parse(tokens: Array<Token>) {
        this.tokens = tokens;
        this.index = 0;
        this.addr = 0;
        this.cpu = CPU.Z80;
        this.items = new Array<Span>();
        this.errors = new Array<Error>();
        let i = 0;
        let item = new Span();
        while (this.next_token()) {
            if (this.token == undefined) {
                break;
            }
            switch (this.token.kind) {
                case TokenKind.Control:
                    switch (this.token.str) {
                        case 'Z80':
                            this.cpu = CPU.Z80;
                            break;
                        case 'M6502':
                            this.cpu = CPU.M6502;
                            break;
                        case 'ORG':
                            this.next_token();
                            if (this.expect_word()) {
                                this.addr = this.token.val;
                            }
                            break;
                        case 'INCLUDE':
                        case 'INCBIN':
                        case 'BYTE':
                        case 'WORD':
                        case 'CONST':
                        case 'MACRO':
                        case 'ENDM':
                        case 'END':
                            // FIXME
                            break;
                        default:
                            this.error(`unknown keyword: .${ this.token.str } `);
                            break;
                    }
                    break;
                case TokenKind.Label:
                    if (this.expect_name()) {
                        item.label = this.token.str;
                    }
                    break;
                case TokenKind.Name:
                    if (this.expect_name()) {
                        if (this.cpu == CPU.Z80) {
                            this.parse_z80_op(item)
                        }
                    }
                    break;
                case TokenKind.Comment:
                    // a comment, ignore...
                    break;
                default:
                    this.error('unexpected token')
                    break;
            }
            if (item.type != SpanType.Invalid) {
                item.addr = this.addr;
                this.items.push(item);
                this.addr += item.bytes.length;
                item = new Span();
            }
        }
    }
    
    HasErrors(): boolean {
        return this.errors.length > 0;
    }

    PrintErrors() {
        for (let err of this.errors) {
            console.log(`error in line ${ err.line }: ${ err.msg }`)
        }
    }

    parse_z80_op(item: Span) {
        switch (this.token.str) {
            case 'NOP':     item.type = SpanType.Z80_NOP;    item.bytes = [ 0x00 ]; break;
            case 'EXX':     item.type = SpanType.Z80_EXX;    item.bytes = [ 0xD9 ]; break;
            case 'LDI':     item.type = SpanType.Z80_LDI;    item.bytes = [ 0xED, 0xA0 ]; break;
            case 'LDIR':    item.type = SpanType.Z80_LDIR;   item.bytes = [ 0xED, 0xB0 ]; break;
            case 'LDD':     item.type = SpanType.Z80_LDD;    item.bytes = [ 0xED, 0xA8 ]; break;
            case 'LDDR':    item.type = SpanType.Z80_LDDR;   item.bytes = [ 0xED, 0xB8 ]; break;
            case 'CPI':     item.type = SpanType.Z80_CPI;    item.bytes = [ 0xED, 0xA1 ]; break;
            case 'CPIR':    item.type = SpanType.Z80_CPIR;   item.bytes = [ 0xED, 0xB1 ]; break; 
            case 'CPD':     item.type = SpanType.Z80_CPD;    item.bytes = [ 0xED, 0xA9 ]; break;
            case 'CPDR':    item.type = SpanType.Z80_CPDR;   item.bytes = [ 0xED, 0xB9 ]; break;
            case 'DAA':     item.type = SpanType.Z80_DAA;    item.bytes = [ 0x27 ]; break;
            case 'CPL':     item.type = SpanType.Z80_CPL;    item.bytes = [ 0x2F ]; break;
            case 'NEG':     item.type = SpanType.Z80_NEG;    item.bytes = [ 0xED, 0x44 ]; break;
            case 'CCF':     item.type = SpanType.Z80_CCF;    item.bytes = [ 0x3F ]; break;
            case 'SCF':     item.type = SpanType.Z80_SCF;    item.bytes = [ 0x37 ]; break;
            case 'HALT':    item.type = SpanType.Z80_HALT;   item.bytes = [ 0x76 ]; break;
            case 'DI':      item.type = SpanType.Z80_DI;     item.bytes = [ 0xF3 ]; break;
            case 'EI':      item.type = SpanType.Z80_EI;     item.bytes = [ 0xFB ]; break;
            case 'IM0':     item.type = SpanType.Z80_IM0;    item.bytes = [ 0xED, 0x46 ]; break;
            case 'IM1':     item.type = SpanType.Z80_IM1;    item.bytes = [ 0xED, 0x56 ]; break;
            case 'IM2':     item.type = SpanType.Z80_IM2;    item.bytes = [ 0xED, 0x5E ]; break;
            case 'RLCA':    item.type = SpanType.Z80_RLCA;   item.bytes = [ 0x07 ]; break;
            case 'RLA':     item.type = SpanType.Z80_RLA;    item.bytes = [ 0x17 ]; break;
            case 'RRCA':    item.type = SpanType.Z80_RRCA;   item.bytes = [ 0x0F ]; break;
            case 'RRA':     item.type = SpanType.Z80_RRA;    item.bytes = [ 0x1F ]; break;
            case 'RLD':     item.type = SpanType.Z80_RLD;    item.bytes = [ 0xED, 0x6F ]; break;
            case 'RRD':     item.type = SpanType.Z80_RRD;    item.bytes = [ 0xED, 0x67 ]; break;
            case 'RET':     item.type = SpanType.Z80_RET;    item.bytes = [ 0xC9 ]; break;
            case 'RETNZ':   item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xC0 ]; break;
            case 'RETZ':    item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xC8 ]; break;
            case 'RETNC':   item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xD0 ]; break;
            case 'RETC':    item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xD8 ]; break;
            case 'RETPO':   item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xE0 ]; break;
            case 'RETPE':   item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xE8 ]; break;
            case 'RETP':    item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xF0 ]; break;
            case 'RETM':    item.type = SpanType.Z80_RET_cc; item.bytes = [ 0xF8 ]; break;
            case 'RETI':    item.type = SpanType.Z80_RETI;   item.bytes = [ 0xED, 0x4D ]; break;
            case 'RETN':    item.type = SpanType.Z80_RETN;   item.bytes = [ 0xED, 0x45 ]; break;
            case 'INI':     item.type = SpanType.Z80_INI;    item.bytes = [ 0xED, 0xA2 ]; break;
            case 'INIR':    item.type = SpanType.Z80_INIR;   item.bytes = [ 0xED, 0xB2 ]; break;
            case 'IND':     item.type = SpanType.Z80_IND;    item.bytes = [ 0xED, 0xAA ]; break;
            case 'INDR':    item.type = SpanType.Z80_INDR;   item.bytes = [ 0xED, 0xBA ]; break;
            case 'OUTI':    item.type = SpanType.Z80_OUTI;   item.bytes = [ 0xED, 0xA3 ]; break;
            case 'OTIR':    item.type = SpanType.Z80_OTIR;   item.bytes = [ 0xED, 0xB3 ]; break;
            case 'OUTD':    item.type = SpanType.Z80_OUTD;   item.bytes = [ 0xED, 0xAB ]; break;
            case 'OTDR':    item.type = SpanType.Z80_OTDR;   item.bytes = [ 0xED, 0xBB ]; break;
            default:
                this.error(`Invalid Z80 instruction: ${ this.token.str }`)
                break;
        }
    }

    next_token(): boolean {
        this.token = this.tokens[this.index++];
        return this.token != undefined;
    }

    expect_word(): boolean {
        if (this.token == undefined) {
            this.error('unexpected end of stream');
            return false;
        }
        if (this.token.kind != TokenKind.Number) {
            this.error('expected a value');
            return false;
        }
        if ((this.token.val < 0) || (this.token.val > 0xFFFF)) {
            this.error('value too big (expected 16-bit value)');
        }
        return true;
    }

    expect_name(): boolean {
        if (this.token == undefined) {
            this.error('unexpected end of stream');
            return false;
        }
        if ((this.token.str == undefined) || (this.token.str == '')) {
            this.error('expected a valid name');
            return false;
        }
        return true;
    }

    error(msg: string) {
        this.errors.push(new Error(msg, this.token.lineNr));
    }

}

export class HCAsm {
    static hello() {
        console.log("Hello HCAsm");
    }
}
