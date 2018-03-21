
function fatal_if(c: boolean, msg: string) {
    if (c) throw msg;
}

export enum TokenKind {
    Invalid,
    Unknown,
    Name,                   // any string
    Number,                 // a number ($ prefix for hex, % prefix for binary)
    String,                 // a string literal (everything between "")
    Comma,                  // ','
    Colon,                  // ':'
    Plus,                   // '+'
    Pound,                  // '#'
    LeftBracket,            // '('
    RightBracket,           // ')'
    Separator,              // statement separator (newline)
    EOF,                    // end-of-stream
};

export function TokenKindToString(kind: TokenKind): string {
    switch (kind) {
        case TokenKind.Invalid:         return "Invalid";
        case TokenKind.Unknown:         return "Unknown";
        case TokenKind.Name:            return "Name";
        case TokenKind.Number:          return "Number";
        case TokenKind.String:          return "String";
        case TokenKind.Comma:           return "Comma";
        case TokenKind.Colon:           return "Colon";
        case TokenKind.Plus:            return "Plus";
        case TokenKind.Pound:           return "Pound";
        case TokenKind.LeftBracket:     return "LeftBracket";
        case TokenKind.RightBracket:    return "RightBracket";
        case TokenKind.Separator:       return "Separator";
        case TokenKind.EOF:             return "EOF";
    }
}

export class Token {
    kind: TokenKind = TokenKind.Invalid;
    str: string = null;
    num: number = 0;
    lineNr: number = 0;

    /** return a new tag-token */
    static Tag(kind: TokenKind, lineNr: number): Token {
        let token = new Token;
        token.kind = kind;
        token.lineNr = lineNr;
        return token;
    }

    /** return a new name-token */
    static Name(kind: TokenKind, src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = kind;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        return token;
    }

    /** return a new string token (with un-escape) */
    static String(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.String;
        // FIXME unescape the string!
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        return token;
    }

    /** return a new number token parsed as decimal number */
    static Decimal(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.num = parseInt(token.str, 10);
        fatal_if(isNaN(token.num), `internal error: failed to parse ${token.str} as integer`);
        return token;
    }

    /** return a new number token parsed as hex number */
    static Hex(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.num = parseInt(token.str, 16);
        fatal_if(isNaN(token.num), `internal error: failed to parse ${token.str} as hex`);
        return token;
    }

    /** return a new number token parsed as binary number */
    static Binary(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.num = parseInt(token.str, 2);
        fatal_if(isNaN(token.num), `internal error: failed to parse ${token.str} as binary`);
        return token;
    }

    /** return a human-readable string with the token state (for debugging) */
    ToString(): string {
        if (TokenKind.Number === this.kind) {
            return `${this.lineNr}: ${ TokenKindToString(this.kind) } ${ this.num}`
        }
        else if (this.str) {
            return `${this.lineNr}: ${ TokenKindToString(this.kind) } ${ this.str }`
        }
        else {
            return `${this.lineNr}: ${ TokenKindToString(this.kind) }`
        }
    }
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

    /** return true if character is a decimal digit */
    private static isDecDigit(c: string): boolean {
        return c >= '0' && c <= '9';
    }

    /** return true if character is a hex digit */
    private static isHexDigit(c: string): boolean {
        return Tokenizer.isDecDigit(c) || (c>='A' && c<='F') || (c>='a' && c<='f');
    }

    /** return true if character is a binary digit */
    private static isBinDigit(c: string): boolean {
        return (c === '0') || (c === '1');
    }

    /** return true if character is an alphanumeric character */
    private static isAlnum(c: string): boolean {
        return (c >= '0' && c <= '9') || 
               (c >= 'A' && c <= 'Z') || 
               (c >= 'a' && c <= 'z') ||
               (c === '_');
    }

    /** return true if character is any line-end char */
    private static isLineEnd(c: string): boolean {
        return (c === '\n') || (c === '\r') || (c === undefined);
    }

    /** return true if character is whitespace */
    private static isWhiteSpace(c: string): boolean {
        return (c === ' ') || (c === '\t') || (c === '\r');
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
            if (c === undefined) {
                return null;
            }
            if (c === '$') {
                this.advance_skip();
                while (Tokenizer.isHexDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Hex(this.src, this.start, this.end, this.lineNr);
            }
            else if (c === '%') {
                this.advance_skip();
                while (Tokenizer.isBinDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Binary(this.src, this.start, this.end, this.lineNr);
            }
            else if (Tokenizer.isDecDigit(c)) { // a decimal number
                while (Tokenizer.isDecDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Decimal(this.src, this.start, this.end, this.lineNr);
            }
            else if (c === '\"') {
                this.advance_skip();
                while (this.cur_char() && (this.cur_char() != '\"')) {
                    this.advance_take();
                    // skip escape sequences
                    if (this.cur_char() === '\\') {
                        this.advance_take();
                    }
                }
                this.advance_ignore();
                return Token.String(this.src, this.start, this.end, this.lineNr);
            }
            else if (c === ',') {
                this.advance_ignore();
                return Token.Tag(TokenKind.Comma, this.lineNr);
            }
            else if (c === '+') {
                this.advance_ignore();
                return Token.Tag(TokenKind.Plus, this.lineNr);
            }
            else if (c === '#') {
                this.advance_ignore();
                return Token.Tag(TokenKind.Pound, this.lineNr);
            }
            else if (c == ':') {
                this.advance_ignore();
                return Token.Tag(TokenKind.Colon, this.lineNr);
            }
            else if (c === '(') {
                this.advance_ignore();
                return Token.Tag(TokenKind.LeftBracket, this.lineNr);
            }
            else if (c === ')') {
                this.advance_ignore();
                return Token.Tag(TokenKind.RightBracket, this.lineNr);
            }
            else if (Tokenizer.isAlnum(c)) {
                while (Tokenizer.isAlnum(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Name(TokenKind.Name, this.src, this.start, this.end, this.lineNr);
            }
            else if (c === '\n') {
                this.lineNr++;
                this.advance_ignore();
                return Token.Tag(TokenKind.Separator, this.lineNr);
            }
            else if (Tokenizer.isWhiteSpace(c)) {
                this.advance_ignore();
            }
            else if (c === ';') {
                // a comment, skip to line end, and produce a separator token
                while (this.cur_char() != '\n') {
                    this.advance_ignore();
                }
                this.lineNr++;
                return Token.Tag(TokenKind.Separator, this.lineNr);
            }
            else {
                // invalid character encountered
                this.advance_ignore();
                return Token.Tag(TokenKind.Unknown, this.lineNr);
            }
        }
    }
}

/** tokens parsed into abstract syntax items by the parser */
enum SyntaxItemKind {
    Invalid,
    // misc
    Comma, Name, String, Number,
    // meta items
    Org, Z80, M6502, Include, Incbin, DefByte, DefWord, 
    Const, Macro, EndMacro, End, Label,
    // CPU instructions
    ADC, ADD, AND, BIT, 
    CALL, CALLNZ, CALLZ, CALLNC, CALLC, CALLPO, CALLPE, CALLP, CALLM,
    CCF, CP, CPD, CPDR, CPI, CPIR, CPL, DAA, DEC, DI, 
    DJNZ, EI, EX, EXX, HALT, IM0, IM1, IM2, INC, IND, INDR, INI, INIR, 
    JP, JPNZ, JPZ, JPNC, JPC, JPPO, JPPE, JPP, JPM, JR, JRNC, JRC, JRNZ, JRZ,
    LD, LDD, LDDR, LDI, LDIR, NEG, NOP, OR, OTDR, OTIR, OUT, OUTD, OUTI, POP,
    PUSH, RES, RET, RETNZ, RETZ, RETNC, RETC, RETPO, RETPE, RETP, RETM,
    RL, RLA, RLC, RLD, RR, RRA, RRC, RRCA, RRD, RST, SBC, SCF, SET, SLA, SRA,
    SRL, SUB, XOR,
    // registers
    B, C, D, E, H, L, A, F, I, R,
    BC, DE, HL, AF, IX, IY, 
    AF_,    // AF' (for EX AF,AF')
    // operands
    iHL,    // (HL)
    iBC,    // (BC)
    iDE,    // (DE)
    iSP,    // (SP)
    iIX,    // (IX) (for JP (IX))
    iIY,    // (IY) (for JP (IY))
    iIXd,   // (IX+d)
    iIYd,   // (IY+d)
    iC,     // (C)
    iImm,   // (nn) or (n) indirect (16- or 8-bit must be checked by assembler)
};

let SyntaxNameMap: {[key:string]: SyntaxItemKind } = {
    'ORG':      SyntaxItemKind.Org, 
    'Z80':      SyntaxItemKind.Z80, 
    'M6502':    SyntaxItemKind.M6502, 
    'INCLUDE':  SyntaxItemKind.Include,
    'INCBIN':   SyntaxItemKind.Incbin,
    'DB':       SyntaxItemKind.DefByte,
    'DW':       SyntaxItemKind.DefWord, 
    'CONST':    SyntaxItemKind.Const,
    'MACRO':    SyntaxItemKind.Macro,
    'ENDM':     SyntaxItemKind.EndMacro,
    'END':      SyntaxItemKind.End,
    'ADC':      SyntaxItemKind.ADC,
    'ADD':      SyntaxItemKind.ADD,
    'AND':      SyntaxItemKind.AND,
    'BIT':      SyntaxItemKind.BIT,
    'CALL':     SyntaxItemKind.CALL,
    'CALLNZ':   SyntaxItemKind.CALLNZ,
    'CALLZ':    SyntaxItemKind.CALLZ,
    'CALLNC':   SyntaxItemKind.CALLNC,
    'CALLC':    SyntaxItemKind.CALLC,
    'CALLPO':   SyntaxItemKind.CALLPO,
    'CALLPE':   SyntaxItemKind.CALLPE,
    'CALLP':    SyntaxItemKind.CALLP,
    'CALLM':    SyntaxItemKind.CALLM,
    'CCF':      SyntaxItemKind.CCF,
    'CP':       SyntaxItemKind.CP,
    'CPD':      SyntaxItemKind.CPD,
    'CPDR':     SyntaxItemKind.CPDR,
    'CPI':      SyntaxItemKind.CPI,
    'CPIR':     SyntaxItemKind.CPIR,
    'CPL':      SyntaxItemKind.CPL,
    'DAA':      SyntaxItemKind.DAA,
    'DEC':      SyntaxItemKind.DEC,
    'DI':       SyntaxItemKind.DI, 
    'DJNZ':     SyntaxItemKind.DJNZ,
    'EI':       SyntaxItemKind.EI,
    'EX':       SyntaxItemKind.EX,
    'EXX':      SyntaxItemKind.EXX, 
    'HALT':     SyntaxItemKind.HALT,
    'IM0':      SyntaxItemKind.IM0,
    'IM1':      SyntaxItemKind.IM1, 
    'IM2':      SyntaxItemKind.IM2,
    'INC':      SyntaxItemKind.INC,
    'IND':      SyntaxItemKind.IND,
    'INDR':     SyntaxItemKind.INDR,
    'INI':      SyntaxItemKind.INI,
    'INIR':     SyntaxItemKind.INIR,
    'JP':       SyntaxItemKind.JP,
    'JPNZ':     SyntaxItemKind.JPNZ,
    'JPZ':      SyntaxItemKind.JPZ,
    'JPNC':     SyntaxItemKind.JPNC,
    'JPC':      SyntaxItemKind.JPC,
    'JPPO':     SyntaxItemKind.JPPO,
    'JPPE':     SyntaxItemKind.JPPE,
    'JPP':      SyntaxItemKind.JPP,
    'JPM':      SyntaxItemKind.JPM,
    'JR':       SyntaxItemKind.JR,
    'JRNC':     SyntaxItemKind.JRNC,
    'JRC':      SyntaxItemKind.JRC,
    'JRNZ':     SyntaxItemKind.JRNZ,
    'JRZ':      SyntaxItemKind.JRZ,
    'LD':       SyntaxItemKind.LD,
    'LDD':      SyntaxItemKind.LDD,
    'LDDR':     SyntaxItemKind.LDDR,
    'LDI':      SyntaxItemKind.LDI,
    'LDIR':     SyntaxItemKind.LDIR,
    'NEG':      SyntaxItemKind.NEG,
    'NOP':      SyntaxItemKind.NOP,
    'OR':       SyntaxItemKind.OR,
    'OTDR':     SyntaxItemKind.OTDR,
    'OTIR':     SyntaxItemKind.OTIR,
    'OUT':      SyntaxItemKind.OUT,
    'OUTD':     SyntaxItemKind.OUTD,
    'OUTI':     SyntaxItemKind.OUTI,
    'POP':      SyntaxItemKind.POP,
    'PUSH':     SyntaxItemKind.PUSH,
    'RES':      SyntaxItemKind.RES,
    'RET':      SyntaxItemKind.RET,
    'RETNZ':    SyntaxItemKind.RETNZ,
    'RETZ':     SyntaxItemKind.RETZ,
    'RETNC':    SyntaxItemKind.RETNC,
    'RETC':     SyntaxItemKind.RETC,
    'RETPO':    SyntaxItemKind.RETPO,
    'RETPE':    SyntaxItemKind.RETPE,
    'RETP':     SyntaxItemKind.RETP,
    'RETM':     SyntaxItemKind.RETM,
    'RL':       SyntaxItemKind.RL,
    'RLA':      SyntaxItemKind.RLA,
    'RLC':      SyntaxItemKind.RLC,
    'RLD':      SyntaxItemKind.RLD,
    'RR':       SyntaxItemKind.RR,
    'RRA':      SyntaxItemKind.RRA,
    'RRC':      SyntaxItemKind.RRC,
    'RRCA':     SyntaxItemKind.RRCA,
    'RRD':      SyntaxItemKind.RRD,
    'RST':      SyntaxItemKind.RST,
    'SBC':      SyntaxItemKind.SBC,
    'SCF':      SyntaxItemKind.SCF,
    'SET':      SyntaxItemKind.SET,
    'SLA':      SyntaxItemKind.SLA,
    'SRA':      SyntaxItemKind.SRA,
    'SRL':      SyntaxItemKind.SRL,
    'SUB':      SyntaxItemKind.SUB,
    'XOR':      SyntaxItemKind.XOR,
    'B':        SyntaxItemKind.B,
    'C':        SyntaxItemKind.C,
    'D':        SyntaxItemKind.D,
    'E':        SyntaxItemKind.H,
    'L':        SyntaxItemKind.L,
    'A':        SyntaxItemKind.A,
    'F':        SyntaxItemKind.F,
    'I':        SyntaxItemKind.I,
    'R':        SyntaxItemKind.R,
    'BC':       SyntaxItemKind.BC,
    'DE':       SyntaxItemKind.DE,
    'HL':       SyntaxItemKind.HL,
    'AF':       SyntaxItemKind.AF,
    'IX':       SyntaxItemKind.IX,
    'IY':       SyntaxItemKind.IY,
    "AF'":      SyntaxItemKind.AF_,
};

class SyntaxItem {
    kind:   SyntaxItemKind = SyntaxItemKind.Invalid;
    str: string = null;
    num: number = 0;
    lo:  number = 0;
    hi:  number = 0;
    line: number = 0;
    valid: boolean = true;
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
 * an array of SyntaxItems
 */
export class Parser {
    addr: number = 0;
    tokens: Array<Token>;
    index: number = 0;
    items: Array<SyntaxItem>;
    errors: Array<Error> = new Array<Error>();

    private peek_token(): Token {
        let token = this.tokens[this.index];
        if (token === undefined) {
            token = new Token();
            token.kind = TokenKind.EOF;
        }
        return token;
    }

    private skip_token() {
        this.index++;
    }

    private next_token(): Token {
        let token = this.peek_token();
        this.skip_token();
        return token;
    }

    private error(item: SyntaxItem, msg: string) {
        item.valid = false;
        this.errors.push(new Error(msg, item.line));
    }

    Parse(tokens: Array<Token>) {
        this.tokens = tokens;
        this.index = 0;
        this.items = new Array<SyntaxItem>();
        this.errors = new Array<Error>();
        let i = 0;
        while (true) {
            let item = new SyntaxItem();
            let token = this.next_token();
            if (token.kind === TokenKind.EOF) {
                break;
            }
            item.line = token.lineNr;
            if (token.kind === TokenKind.Comma) {
                // comma separators are passed through
                item.kind = SyntaxItemKind.Comma;
            }
            else if (token.kind === TokenKind.Number) {
                item.kind = SyntaxItemKind.Number;
                item.num = token.num;
                item.lo  = token.num & 0xFF;
                item.hi  = (token.num>>8) & 0xFF;
            }
            else if (token.kind === TokenKind.String) {
                // pass through string literals
                item.kind = SyntaxItemKind.String;
                item.str = token.str;
            }
            else if (token.kind === TokenKind.Name) {
                if (this.peek_token().kind === TokenKind.Colon) {
                    this.skip_token();
                    item.kind = SyntaxItemKind.Label;
                    item.str = token.str;
                }
                else if (token.str in SyntaxNameMap) {
                    item.kind = SyntaxNameMap[token.str];
                    item.str = token.str;
                }
                else {
                    item.kind = SyntaxItemKind.Name;
                    item.str = token.str;
                }
            }
            else if (token.kind === TokenKind.LeftBracket) {
                token = this.next_token();
                if (token.kind === TokenKind.Number) {
                    item.kind = SyntaxItemKind.iImm;
                    item.num = token.num;
                    item.lo = token.num & 0xFF;
                    item.hi = (token.num>>8) & 0xFF;
                }
                else if (token.kind === TokenKind.Name) {
                    if (token.str === 'HL') {
                        // (HL)
                        item.kind = SyntaxItemKind.iHL;
                    }
                    else if (token.str === 'BC') {
                        // (BC)
                        item.kind = SyntaxItemKind.iBC;
                    }
                    else if (token.str === 'DE') {
                        // (DE)
                        item.kind = SyntaxItemKind.iDE;
                    }
                    else if (token.str === 'SP') {
                        // (SP)
                        item.kind = SyntaxItemKind.iSP;
                    }
                    else if (token.str === 'C') {
                        // (C)
                        item.kind = SyntaxItemKind.iC;
                    }
                    else if ((token.str === 'IX') || (token.str === 'IY')) {
                        // (IX), (IY), (IX+d) or (IY+d)
                        token = this.next_token();
                        if (token.kind === TokenKind.Plus) {
                            // (IX+d) or (IY+d)
                            item.kind = token.str==='IX' ? SyntaxItemKind.iIXd:SyntaxItemKind.iIYd;
                            token = this.next_token();
                            if (token.kind === TokenKind.Number) {
                                item.num = token.num;
                                item.lo = token.num & 0xFF;
                                item.hi = (token.num>>8) && 0xFF;
                            }
                            else {
                                this.error(item, "expected offset in (IX+d) / (IY+d)")
                            }
                        }
                        else {
                            // (IX) or (IY)
                            item.kind = token.str==='IX' ? SyntaxItemKind.iIX:SyntaxItemKind.iIY;
                        }
                    }
                    token = this.next_token();
                    if (token.kind !== TokenKind.RightBracket) {
                        this.error(item, "expected closing bracket");
                    }
                }
            }
            else {
                this.error(item, `unhandled token: ${ TokenKindToString(token.kind )}`);
            }
            if (item.valid) {
                this.items.push(item);
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

    /*
    parse_z80_op(item: Span) {
        item.valid = true;
        switch (this.token().str) {
            // simple mnemonics without args 
            case 'NOP':     item.bytes = [ 0x00 ]; break;
            case 'EXX':     item.bytes = [ 0xD9 ]; break;
            case 'LDI':     item.bytes = [ 0xED, 0xA0 ]; break;
            case 'LDIR':    item.bytes = [ 0xED, 0xB0 ]; break;
            case 'LDD':     item.bytes = [ 0xED, 0xA8 ]; break;
            case 'LDDR':    item.bytes = [ 0xED, 0xB8 ]; break;
            case 'CPI':     item.bytes = [ 0xED, 0xA1 ]; break;
            case 'CPIR':    item.bytes = [ 0xED, 0xB1 ]; break; 
            case 'CPD':     item.bytes = [ 0xED, 0xA9 ]; break;
            case 'CPDR':    item.bytes = [ 0xED, 0xB9 ]; break;
            case 'DAA':     item.bytes = [ 0x27 ]; break;
            case 'CPL':     item.bytes = [ 0x2F ]; break;
            case 'NEG':     item.bytes = [ 0xED, 0x44 ]; break;
            case 'CCF':     item.bytes = [ 0x3F ]; break;
            case 'SCF':     item.bytes = [ 0x37 ]; break;
            case 'HALT':    item.bytes = [ 0x76 ]; break;
            case 'DI':      item.bytes = [ 0xF3 ]; break;
            case 'EI':      item.bytes = [ 0xFB ]; break;
            case 'IM0':     item.bytes = [ 0xED, 0x46 ]; break;
            case 'IM1':     item.bytes = [ 0xED, 0x56 ]; break;
            case 'IM2':     item.bytes = [ 0xED, 0x5E ]; break;
            case 'RLCA':    item.bytes = [ 0x07 ]; break;
            case 'RLA':     item.bytes = [ 0x17 ]; break;
            case 'RRCA':    item.bytes = [ 0x0F ]; break;
            case 'RRA':     item.bytes = [ 0x1F ]; break;
            case 'RLD':     item.bytes = [ 0xED, 0x6F ]; break;
            case 'RRD':     item.bytes = [ 0xED, 0x67 ]; break;
            case 'RET':     item.bytes = [ 0xC9 ]; break;
            case 'RETNZ':   item.bytes = [ 0xC0 ]; break;
            case 'RETZ':    item.bytes = [ 0xC8 ]; break;
            case 'RETNC':   item.bytes = [ 0xD0 ]; break;
            case 'RETC':    item.bytes = [ 0xD8 ]; break;
            case 'RETPO':   item.bytes = [ 0xE0 ]; break;
            case 'RETPE':   item.bytes = [ 0xE8 ]; break;
            case 'RETP':    item.bytes = [ 0xF0 ]; break;
            case 'RETM':    item.bytes = [ 0xF8 ]; break;
            case 'RETI':    item.bytes = [ 0xED, 0x4D ]; break;
            case 'RETN':    item.bytes = [ 0xED, 0x45 ]; break;
            case 'INI':     item.bytes = [ 0xED, 0xA2 ]; break;
            case 'INIR':    item.bytes = [ 0xED, 0xB2 ]; break;
            case 'IND':     item.bytes = [ 0xED, 0xAA ]; break;
            case 'INDR':    item.bytes = [ 0xED, 0xBA ]; break;
            case 'OUTI':    item.bytes = [ 0xED, 0xA3 ]; break;
            case 'OTIR':    item.bytes = [ 0xED, 0xB3 ]; break;
            case 'OUTD':    item.bytes = [ 0xED, 0xAB ]; break;
            case 'OTDR':    item.bytes = [ 0xED, 0xBB ]; break;
            default:
                this.error(item, `Invalid Z80 instruction: ${ this.token().str }`)
                item.valid = false;
                break;
        }
    }
    
    parse_z80_ld(item: Span) {
        let dst = this.parse_z80_arg(item);
        this.next_token();
        if (this.expect_comma(item)) {
            let src = this.parse_z80_arg(item);
            if (dst.kind == ArgKind.R8) {
                if (src.kind == ArgKind.R8) {
                    // LD r,r'
                    item.bytes = [ 0b01000000 | (dst.val<<3) | src.val ];
                }
                else if (src.kind == ArgKind.Imm) {
                    // LD r,n
                    if (this.expect_byte_val(src.val, item)) {
                        item.bytes = [ 0x00000110 | (dst.val<<3), src.val ];
                    }
                }
                else if (src.kind == ArgKind.iHL) {
                    // LD r,(HL)
                    item.bytes = [ 0b01000110 | (dst.val<<3) ];
                }
                else if (src.kind == ArgKind.iIXYd) {
                    // LD r,(IX|IY+d)
                    item.bytes = [ src.prefix, 0b01000110 | (dst.val<<3), src.val ];
                }
                else if (dst.name == 'A') {
                    // special LD A,... ops
                    if (src.kind == ArgKind.iBC) { 
                        // LD A,(BC)
                        item.bytes = [ 0x0A ];
                    }
                    else if (src.kind == ArgKind.iDE) {
                        // LD A,(DE)
                        item.bytes = [ 0x1A ];
                    }
                    else if (src.kind == ArgKind.I) {
                        // LD A,I
                        item.bytes = [ 0xED, 0x57 ];
                    }
                    else if (src.kind == ArgKind.R) {
                        // LD A,R
                        item.bytes = [ 0xED, 0x5F ];
                    }
                    else if (src.kind == ArgKind.inn) {
                        // LD A,(nn)
                        item.bytes = [ 0x3D, src.lo, src.hi ];
                    }
                    else {
                        this.error(item, "expected (BC), (DE) or (nn)");
                    }
                }
                else {
                    this.error(item, "expected A..L, (HL), (IX+d), (IY+d) or byte value");
                }
            }
            else if (dst.kind == ArgKind.iHL) {
                if (src.kind == ArgKind.R8) {
                    // LD (HL),r
                    item.bytes = [ 0b01110000 | src.val ]
                }
                else if (src.kind == ArgKind.Imm) {
                    // LD (HL),n
                    if (this.expect_byte_val(src.val, item)) {
                        item.bytes = [ 0x36, src.val ];
                    }
                }
                else {
                    this.error(item, "expected A..L or byte value")
                }
            }
            else if (dst.kind == ArgKind.iIXYd) {
                if (src.kind == ArgKind.R8) {
                    // LD (HL),r
                    item.bytes = [ dst.prefix, 0b01110000 | src.val ];
                }
                else if (src.kind == ArgKind.Imm) {
                    // LD (HL),n
                    if (this.expect_byte_val(src.val, item)) {
                        item.bytes = [ dst.prefix, 0x36, dst.val, src.val ];
                    }
                }
                else {
                    this.error(item, "expected A..L or byte value")
                }
            }
            else if (dst.kind == ArgKind.inn) {
                // LD (nn),...
                if (src.name = 'A') {
                    // LD (nn),A
                    item.bytes = [ 0x32, src.lo, src.hi];
                }
                else if (src.name == 'HL') {
                    // LD (nn),HL
                    item.bytes = [ 0x22, src.lo, src.hi ];
                }
                else if (src.name == 'BC') {
                    // LD (nn),BC
                    item.bytes = [ 0xED, 0x43, src.lo, src.hi ];
                }
                else if (src.name == 'DE') {
                    // LD (nn),DE
                    item.bytes = [ 0xED, 0x53, src.lo, src.hi ];
                }
                else if (src.name == 'SP') {
                    // LD (nn),SP
                    item.bytes = [ 0xED, 0x73, src.lo, src.hi ];
                }
                else if (src.name == 'IX') {
                    // LD (nn),IX
                    item.bytes = [ 0xDD, 0x22, src.lo, src.hi ];
                }
                else if (src.name == 'IY') {
                    // LD (nn),IY
                    item.bytes = [ 0xFD, 0x22, src.lo, src.hi ];
                }
                else {
                    this.error(item, "expected A, HL, BC, DE, SP, IX or IY");
                }
            }
            else {
                this.error(item, "FIXME: more LD ops")
            }
        }
    }
    */
}

export class HCAsm {
    static hello() {
        console.log("Hello HCAsm");
    }
}
