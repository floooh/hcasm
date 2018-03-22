
function fatal_if(c: boolean, msg: string) {
    if (c) { throw msg; }
}

function fatal(msg: string) {
    throw msg;
}

function is_8bit(val: number) {
    return (val >= 0) && (val <= 0xFF);
}

function is_16bit(val: number) {
    return (val >= 0) && (val <= 0xFF);
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
    EOF,                    // end-of-stream
}

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
        case TokenKind.EOF:             return "EOF";
    }
}

export class Token {
    /** return a new tag-token */
    public static Tag(kind: TokenKind, line: number): Token {
        const token = new Token();
        token.kind = kind;
        token.line = line;
        return token;
    }

    /** return a new name-token */
    public static Name(kind: TokenKind, src: string, start: number, end: number, line: number): Token {
        const token = new Token();
        token.kind = kind;
        token.str = src.slice(start, end).toUpperCase();
        token.line = line;
        return token;
    }

    /** return a new string token (with un-escape) */
    public static String(src: string, start: number, end: number, line: number): Token {
        const token = new Token();
        token.kind = TokenKind.String;
        // FIXME unescape the string!
        token.str = src.slice(start, end).toUpperCase();
        token.line = line;
        return token;
    }

    /** return a new number token parsed as decimal number */
    public static Decimal(src: string, start: number, end: number, line: number): Token {
        const token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.line = line;
        token.num = parseInt(token.str, 10);
        fatal_if(isNaN(token.num), `internal error: failed to parse ${token.str} as integer`);
        return token;
    }

    /** return a new number token parsed as hex number */
    public static Hex(src: string, start: number, end: number, line: number): Token {
        const token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.line = line;
        token.num = parseInt(token.str, 16);
        fatal_if(isNaN(token.num), `internal error: failed to parse ${token.str} as hex`);
        return token;
    }

    /** return a new number token parsed as binary number */
    public static Binary(src: string, start: number, end: number, line: number): Token {
        const token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.line = line;
        token.num = parseInt(token.str, 2);
        fatal_if(isNaN(token.num), `internal error: failed to parse ${token.str} as binary`);
        return token;
    }

    public kind: TokenKind = TokenKind.Invalid;
    public str: string = null;
    public num: number = 0;
    public line: number = 0;

    /** return a human-readable string with the token state (for debugging) */
    public ToString(): string {
        if (TokenKind.Number === this.kind) {
            return `${this.line}: ${ TokenKindToString(this.kind) } ${ this.num}`;
        } else if (this.str) {
            return `${this.line}: ${ TokenKindToString(this.kind) } ${ this.str }`;
        } else {
            return `${this.line}: ${ TokenKindToString(this.kind) }`;
        }
    }
}

/**
 * The Tokenizer takes a source code string as input and produces
 * a token stream.
 */
export class Tokenizer {
    /** tokenize a string into a token array */
    public static Tokenize(str: string): Token[] {
        const tokenizer = new Tokenizer(str);
        const tokens = new Array<Token>();
        let token = null;
        while (token = tokenizer.next_token()) {
            tokens.push(token);
        }
        return tokens;
    }

    /** return true if character is a decimal digit */
    private static isDecDigit(c: string): boolean {
        return c >= "0" && c <= "9";
    }

    /** return true if character is a hex digit */
    private static isHexDigit(c: string): boolean {
        return Tokenizer.isDecDigit(c) || (c >= "A" && c <= "F") || (c >= "a" && c <= "f");
    }

    /** return true if character is a binary digit */
    private static isBinDigit(c: string): boolean {
        return (c === "0") || (c === "1");
    }

    /** return true if character is an alphanumeric character */
    private static isAlnum(c: string): boolean {
        return (c >= "0" && c <= "9") || 
               (c >= "A" && c <= "Z") || 
               (c >= "a" && c <= "z") ||
               (c === "_");
    }

    /** return true if character is any line-end char */
    private static isLineEnd(c: string): boolean {
        return (c === "\n") || (c === "\r") || (c === undefined);
    }

    /** return true if character is whitespace */
    private static isWhiteSpace(c: string): boolean {
        return (c === " ") || (c === "\t") || (c === "\r");
    }

    private src: string;
    private pos: number = 0;
    private start: number = 0;
    private end: number = 0;
    private line: number = 0;
    
    constructor(str: string) {
        this.src = str;
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
            const c = this.cur_char();
            if (c === undefined) {
                return null;
            }
            if (c === "$") {
                this.advance_skip();
                while (Tokenizer.isHexDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Hex(this.src, this.start, this.end, this.line);
            } 
            else if (c === "%") {
                this.advance_skip();
                while (Tokenizer.isBinDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Binary(this.src, this.start, this.end, this.line);
            } 
            else if (Tokenizer.isDecDigit(c)) { // a decimal number
                while (Tokenizer.isDecDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Decimal(this.src, this.start, this.end, this.line);
            }
            else if (c === '\"') {
                this.advance_skip();
                while (this.cur_char() && (this.cur_char() !== '\"')) {
                    this.advance_take();
                    // skip escape sequences
                    if (this.cur_char() === "\\") {
                        this.advance_take();
                    }
                }
                this.advance_ignore();
                return Token.String(this.src, this.start, this.end, this.line);
            }
            else if (c === ",") {
                this.advance_ignore();
                return Token.Tag(TokenKind.Comma, this.line);
            }
            else if (c === "+") {
                this.advance_ignore();
                return Token.Tag(TokenKind.Plus, this.line);
            }
            else if (c === "#") {
                this.advance_ignore();
                return Token.Tag(TokenKind.Pound, this.line);
            }
            else if (c === ":") {
                this.advance_ignore();
                return Token.Tag(TokenKind.Colon, this.line);
            }
            else if (c === "(") {
                this.advance_ignore();
                return Token.Tag(TokenKind.LeftBracket, this.line);
            }
            else if (c === ")") {
                this.advance_ignore();
                return Token.Tag(TokenKind.RightBracket, this.line);
            }
            else if (Tokenizer.isAlnum(c)) {
                while (Tokenizer.isAlnum(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Name(TokenKind.Name, this.src, this.start, this.end, this.line);
            }
            else if (c === "\n") {
                this.advance_ignore();
                this.line++;
            }
            else if (Tokenizer.isWhiteSpace(c)) {
                this.advance_ignore();
            }
            else if (c === ";") {
                // a comment, skip to line end, and produce a separator token
                this.advance_ignore();
                while (!Tokenizer.isLineEnd(this.cur_char())) {
                    this.advance_ignore();
                }
            }
            else {
                // invalid character encountered
                this.advance_ignore();
                return Token.Tag(TokenKind.Unknown, this.line);
            }
        }
    }
}

/** tokens parsed into abstract syntax items by the parser */
enum SyntaxItemKind {
    Invalid,
    Comma,      // pass-through from TokenKind
    Name,       // pass-through from TokenKind
    String,     // pass-through from TokenKind
    Number,     // pass-through from TokenKind
    Label,      // a label 
    Keyword,    // org, z80, m6502, db, etc...
    Z80Op,      // a Z80 instruction
    Z80R8,      // a regular Z80 8-bit register (B,C,D,E,H,L,A)
    Z80RI,      // the special I register
    Z80RR,      // the special R register
    Z80R16,     // a Z80 16-bit register
    Z80IndR16,  // Z80 indirection through 16-bit register
    Z80IndIdx,  // Z80 indexed-indirect (IX+d) or (IY+d)
    Z80IndC,    // Z80 indirect (C)
    Z80IndImm,  // Z80 indirect-immediate 
    EOF,        // end of syntax item stream
}

function SyntaxItemKindToString(kind: SyntaxItemKind): string {
    switch (kind) {
        case SyntaxItemKind.Invalid:    return "Invalid";
        case SyntaxItemKind.Comma:      return "Comma";
        case SyntaxItemKind.Name:       return "Name";
        case SyntaxItemKind.String:     return "String";
        case SyntaxItemKind.Number:     return "Number";
        case SyntaxItemKind.Label:      return "Label";
        case SyntaxItemKind.Keyword:    return "Keyword";
        case SyntaxItemKind.Z80Op:      return "Z80Op";
        case SyntaxItemKind.Z80R8:      return "Z80R8";
        case SyntaxItemKind.Z80RI:      return "Z80RI";
        case SyntaxItemKind.Z80RR:      return "Z80RR";
        case SyntaxItemKind.Z80R16:     return "Z80R16";
        case SyntaxItemKind.Z80IndR16:  return "Z80IndR16";
        case SyntaxItemKind.Z80IndIdx:  return "Z80IndIdx";
        case SyntaxItemKind.Z80IndC:    return "Z80IndC";
        case SyntaxItemKind.Z80IndImm:  return "Z80IndImm";
        case SyntaxItemKind.EOF:        return "EOF";
        default: return "UNKNOWN";
    }
}

const SyntaxNameMap: {[key: string]: SyntaxItemKind } = {
    "ORG":      SyntaxItemKind.Keyword,
    "Z80":      SyntaxItemKind.Keyword,
    "M6502":    SyntaxItemKind.Keyword, 
    "INCLUDE":  SyntaxItemKind.Keyword,
    "INCBIN":   SyntaxItemKind.Keyword,
    "DB":       SyntaxItemKind.Keyword,
    "DW":       SyntaxItemKind.Keyword,
    "CONST":    SyntaxItemKind.Keyword,
    "MACRO":    SyntaxItemKind.Keyword,
    "ENDM":     SyntaxItemKind.Keyword,
    "END":      SyntaxItemKind.Keyword,
    "ADC":      SyntaxItemKind.Z80Op,
    "ADD":      SyntaxItemKind.Z80Op,
    "AND":      SyntaxItemKind.Z80Op,
    "BIT":      SyntaxItemKind.Z80Op,
    "CALL":     SyntaxItemKind.Z80Op,
    "CALLNZ":   SyntaxItemKind.Z80Op,
    "CALLZ":    SyntaxItemKind.Z80Op,
    "CALLNC":   SyntaxItemKind.Z80Op,
    "CALLC":    SyntaxItemKind.Z80Op,
    "CALLPO":   SyntaxItemKind.Z80Op,
    "CALLPE":   SyntaxItemKind.Z80Op,
    "CALLP":    SyntaxItemKind.Z80Op,
    "CALLM":    SyntaxItemKind.Z80Op,
    "CCF":      SyntaxItemKind.Z80Op,
    "CP":       SyntaxItemKind.Z80Op,
    "CPD":      SyntaxItemKind.Z80Op,
    "CPDR":     SyntaxItemKind.Z80Op,
    "CPI":      SyntaxItemKind.Z80Op,
    "CPIR":     SyntaxItemKind.Z80Op,
    "CPL":      SyntaxItemKind.Z80Op,
    "DAA":      SyntaxItemKind.Z80Op,
    "DEC":      SyntaxItemKind.Z80Op,
    "DI":       SyntaxItemKind.Z80Op,
    "DJNZ":     SyntaxItemKind.Z80Op,
    "EI":       SyntaxItemKind.Z80Op,
    "EX":       SyntaxItemKind.Z80Op,
    "EXX":      SyntaxItemKind.Z80Op,
    "HALT":     SyntaxItemKind.Z80Op,
    "IM0":      SyntaxItemKind.Z80Op,
    "IM1":      SyntaxItemKind.Z80Op,
    "IM2":      SyntaxItemKind.Z80Op,
    "INC":      SyntaxItemKind.Z80Op,
    "IND":      SyntaxItemKind.Z80Op,
    "INDR":     SyntaxItemKind.Z80Op,
    "INI":      SyntaxItemKind.Z80Op,
    "INIR":     SyntaxItemKind.Z80Op,
    "JP":       SyntaxItemKind.Z80Op,
    "JPNZ":     SyntaxItemKind.Z80Op,
    "JPZ":      SyntaxItemKind.Z80Op,
    "JPNC":     SyntaxItemKind.Z80Op,
    "JPC":      SyntaxItemKind.Z80Op,
    "JPPO":     SyntaxItemKind.Z80Op,
    "JPPE":     SyntaxItemKind.Z80Op,
    "JPP":      SyntaxItemKind.Z80Op,
    "JPM":      SyntaxItemKind.Z80Op,
    "JR":       SyntaxItemKind.Z80Op,
    "JRNC":     SyntaxItemKind.Z80Op,
    "JRC":      SyntaxItemKind.Z80Op,
    "JRNZ":     SyntaxItemKind.Z80Op,
    "JRZ":      SyntaxItemKind.Z80Op,
    "LD":       SyntaxItemKind.Z80Op,
    "LDD":      SyntaxItemKind.Z80Op,
    "LDDR":     SyntaxItemKind.Z80Op,
    "LDI":      SyntaxItemKind.Z80Op,
    "LDIR":     SyntaxItemKind.Z80Op,
    "NEG":      SyntaxItemKind.Z80Op,
    "NOP":      SyntaxItemKind.Z80Op,
    "OR":       SyntaxItemKind.Z80Op,
    "OTDR":     SyntaxItemKind.Z80Op,
    "OTIR":     SyntaxItemKind.Z80Op,
    "OUT":      SyntaxItemKind.Z80Op,
    "OUTD":     SyntaxItemKind.Z80Op,
    "OUTI":     SyntaxItemKind.Z80Op,
    "POP":      SyntaxItemKind.Z80Op,
    "PUSH":     SyntaxItemKind.Z80Op,
    "RES":      SyntaxItemKind.Z80Op,
    "RET":      SyntaxItemKind.Z80Op,
    "RETNZ":    SyntaxItemKind.Z80Op,
    "RETZ":     SyntaxItemKind.Z80Op,
    "RETNC":    SyntaxItemKind.Z80Op,
    "RETC":     SyntaxItemKind.Z80Op,
    "RETPO":    SyntaxItemKind.Z80Op,
    "RETPE":    SyntaxItemKind.Z80Op,
    "RETP":     SyntaxItemKind.Z80Op,
    "RETM":     SyntaxItemKind.Z80Op,
    "RL":       SyntaxItemKind.Z80Op,
    "RLA":      SyntaxItemKind.Z80Op,
    "RLC":      SyntaxItemKind.Z80Op,
    "RLD":      SyntaxItemKind.Z80Op,
    "RR":       SyntaxItemKind.Z80Op,
    "RRA":      SyntaxItemKind.Z80Op,
    "RRC":      SyntaxItemKind.Z80Op,
    "RRCA":     SyntaxItemKind.Z80Op,
    "RRD":      SyntaxItemKind.Z80Op,
    "RST":      SyntaxItemKind.Z80Op,
    "SBC":      SyntaxItemKind.Z80Op,
    "SCF":      SyntaxItemKind.Z80Op,
    "SET":      SyntaxItemKind.Z80Op,
    "SLA":      SyntaxItemKind.Z80Op,
    "SRA":      SyntaxItemKind.Z80Op,
    "SRL":      SyntaxItemKind.Z80Op,
    "SUB":      SyntaxItemKind.Z80Op,
    "XOR":      SyntaxItemKind.Z80Op,
    "B":        SyntaxItemKind.Z80R8,
    "C":        SyntaxItemKind.Z80R8,
    "D":        SyntaxItemKind.Z80R8,
    "E":        SyntaxItemKind.Z80R8,
    "H":        SyntaxItemKind.Z80R8,
    "L":        SyntaxItemKind.Z80R8,
    "A":        SyntaxItemKind.Z80R8,
    "I":        SyntaxItemKind.Z80RR,
    "R":        SyntaxItemKind.Z80RI,
    "BC":       SyntaxItemKind.Z80R16,
    "DE":       SyntaxItemKind.Z80R16,
    "HL":       SyntaxItemKind.Z80R16,
    "AF":       SyntaxItemKind.Z80R16,
    "IX":       SyntaxItemKind.Z80R16,
    "IY":       SyntaxItemKind.Z80R16,
    "AF'":      SyntaxItemKind.Z80R16,
};

class SyntaxItem {
    public kind: SyntaxItemKind = SyntaxItemKind.Invalid;
    public str: string = null;
    public num: number = 0;
    public lo: number = 0;
    public hi: number = 0;
    public is8bit: boolean = false;    // true if 0<=num<(1<<8)
    public is16bit: boolean = false;   // true if 0<=num<(1<<16)
    public prefix: number = 0; // only for Z80IndIdx, 0xDD for IX, 0xFD for IY
    public line: number = 0;
    public discard: boolean = false;

    public ToString(): string {
        return `kind: ${SyntaxItemKindToString(this.kind)} str:${this.str} num:${this.num} line:${this.line}`;
    }
}

export class Error {
    public msg: string;
    public line: number;
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
    public tokenIndex: number = 0;
    public tokens: Token[];
    public items: SyntaxItem[];
    public errors: Error[] = new Array<Error>();

    public Parse(tokens: Token[]): SyntaxItem[] {
        this.tokens = tokens;
        this.tokenIndex = 0;
        this.items = new Array<SyntaxItem>();
        this.errors = new Array<Error>();
        while (true) {
            const item = new SyntaxItem();
            let token = this.next_token();
            if (token.kind === TokenKind.EOF) {
                break;
            }
            item.line = token.line;
            if (token.kind === TokenKind.Comma) {
                // comma separators are passed through
                item.kind = SyntaxItemKind.Comma;
                item.str = ",";
            }
            else if (token.kind === TokenKind.Number) {
                item.kind = SyntaxItemKind.Number;
                item.str = token.str;
                item.num = token.num;
                item.lo  = token.num & 0xFF;
                item.hi  = (token.num >> 8) & 0xFF;
                item.is8bit = is_8bit(token.num);
                item.is16bit = is_16bit(token.num);
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
                    if (token.str === "IX") {
                        item.prefix = 0xDD;
                    }
                    else if (token.str === "IY") {
                        item.prefix = 0xFD;
                    }
                }
                else {
                    item.kind = SyntaxItemKind.Name;
                    item.str = token.str;
                }
            }
            else if (token.kind === TokenKind.LeftBracket) {
                token = this.next_token();
                if (token.kind === TokenKind.Number) {
                    item.kind = SyntaxItemKind.Z80IndImm,
                    item.str = token.str;
                    item.num = token.num;
                    item.lo = token.num & 0xFF;
                    item.hi = (token.num >> 8) & 0xFF;
                    item.is8bit = is_8bit(token.num);
                    item.is16bit = is_16bit(token.num);
                    if (!item.is16bit) {
                        this.error(item, "16-bit integer overflow!");
                    }
                }
                else if (token.kind === TokenKind.Name) {
                    item.str = token.str;
                    switch (token.str) {
                        case "HL":
                        case "BC":
                        case "DE":
                        case "SP":
                            item.kind = SyntaxItemKind.Z80IndR16;
                            break;
                        case "C":
                            item.kind = SyntaxItemKind.Z80IndC;
                            break;
                        case "IX":
                        case "IY":
                            item.prefix = token.str === "IX" ? 0xDD : 0xFD;
                            token = this.next_token();
                            if (token.kind === TokenKind.Plus) {
                                // (IX+d) or (IY+d)
                                item.kind = SyntaxItemKind.Z80IndIdx;
                                token = this.next_token();
                                if (token.kind === TokenKind.Number) {
                                    item.num = token.num;
                                    item.lo = token.num & 0xFF;
                                    item.hi = 0;
                                    item.is8bit = is_8bit(token.num);
                                    item.is16bit = is_16bit(token.num);
                                    if (!item.is8bit) {
                                        this.error(item, "d in (IX/IY+d) must be an 8-bit value");
                                    }
                                }
                                else {
                                    this.error(item, "expected offset in (IX+d)/(IY+d)");
                                }
                            }
                            else {
                                item.kind = SyntaxItemKind.Z80IndR16;
                            }
                            break;
                        default:
                            this.error(item, "expected indirection register");
                            break;
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
            if (!item.discard) {
                this.items.push(item);
            }
        }
        return this.items;
    }
    
    public HasErrors(): boolean {
        return this.errors.length > 0;
    }

    public PrintErrors() {
        for (const err of this.errors) {
            console.log(`error in line ${ err.line }: ${ err.msg }`);
        }
    }

    private peek_token(): Token {
        let token = this.tokens[this.tokenIndex];
        if (token === undefined) {
            token = new Token();
            token.kind = TokenKind.EOF;
        }
        return token;
    }

    private skip_token() {
        this.tokenIndex++;
    }

    private next_token(): Token {
        const token = this.peek_token();
        this.skip_token();
        return token;
    }

    private error(item: SyntaxItem, msg: string) {
        item.discard = true;
        this.errors.push(new Error(msg, item.line));
    }

}

/** ByteRanges is what the Assembler generates from SyntaxItem objects */
export class ByteRange {
    public addr: number = 0;
    public bytes: number[];
    public line: number = 0;
    public label: string = null;
    public ready: boolean = false;
    public discard: boolean = false;
}

/** supported CPU types */
enum CPUType {
    None,
    Z80,
    M6502,
}

/** the Assembler converts a stream of SyntaxItem objects into byte ranges */
export class Assembler {
    private static z80R8bits(r8: string): number {
        switch (r8) {
            case "B": return 0b000;
            case "C": return 0b001;
            case "D": return 0b010;
            case "E": return 0b011;
            case "H": return 0b100;
            case "L": return 0b101;
            case "A": return 0b111;
            default:
                fatal("invalid z80 8-bit register name!");
                return 0;
        }
    }

    private static z80R16bits(r16: string): number {
        switch (r16) {
            case "BC": return 0b00;
            case "DE": return 0b01;
            case "HL": return 0b10;
            case "SP": return 0b11;
            default:
                fatal("invalid z80 16-bit register name!");
                return 0;
        }
    }

    public addr: number = 0;
    public cpu: CPUType = CPUType.None;
    public syntaxItemIndex: number = 0;
    public syntaxItems: SyntaxItem[];
    public byteRanges: ByteRange[];
    public errors: Error[] = new Array<Error>();

    public Assemble(syntaxItems: SyntaxItem[]): ByteRange[] {
        this.syntaxItems = syntaxItems;
        this.syntaxItemIndex = 0;
        this.byteRanges = new Array<ByteRange>();
        this.errors = new Array<Error>();
        let outp = new ByteRange();
        while (true) {
            let inp = this.next_item();
            if (inp.kind === SyntaxItemKind.EOF) {
                break;
            }
            outp.line = inp.line;
            outp.addr = this.addr;
            if (inp.kind === SyntaxItemKind.Keyword) {
                switch (inp.str) {
                    case "ORG":
                        inp = this.next_item();
                        this.addr = inp.num;
                        outp.discard = true;
                        break;
                    case "Z80":
                        this.cpu = CPUType.Z80;
                        outp.discard = true;
                        break;
                    case "M6502":
                        this.cpu = CPUType.M6502;
                        outp.discard = true;
                        break;
                    case "INCLUDE":
                    case "INCBIN":
                    case "DB":
                    case "DW":
                    case "CONST":
                    case "MACRO":
                    case "ENDM":
                    case "END": 
                        this.error(outp, `${ inp.str }: NOT IMPLEMENTED YET!`);
                        break;
                }
            }
            else if (inp.kind === SyntaxItemKind.Label) {
                outp.label = inp.str;
            }
            else if (inp.kind === SyntaxItemKind.Z80Op) {
                this.asmZ80Op(inp, outp);
            }
            if (outp.discard) {
                outp = new ByteRange();
            }
            else if (outp.ready) {
                this.byteRanges.push(outp);
                this.addr += outp.bytes.length;
                outp = new ByteRange();
            }
        }
        return this.byteRanges;
    }

    public HasErrors(): boolean {
        return this.errors.length > 0;
    }

    public PrintErrors() {
        for (const err of this.errors) {
            console.log(`error in line ${ err.line }: ${ err.msg }`);
        }
    }

    private asmZ80Op(inp: SyntaxItem, outp: ByteRange) {
        outp.ready = true;
        switch (inp.str) {
            // simple ops without operands
            case "NOP":     outp.bytes = [ 0x00 ]; break;
            case "EXX":     outp.bytes = [ 0xD9 ]; break;
            case "LDI":     outp.bytes = [ 0xED, 0xA0 ]; break;
            case "LDIR":    outp.bytes = [ 0xED, 0xB0 ]; break;
            case "LDD":     outp.bytes = [ 0xED, 0xA8 ]; break;
            case "LDDR":    outp.bytes = [ 0xED, 0xB8 ]; break;
            case "CPI":     outp.bytes = [ 0xED, 0xA1 ]; break;
            case "CPIR":    outp.bytes = [ 0xED, 0xB1 ]; break;
            case "CPD":     outp.bytes = [ 0xED, 0xA9 ]; break;
            case "CPDR":    outp.bytes = [ 0xED, 0xB9 ]; break;
            case "DAA":     outp.bytes = [ 0x27 ]; break;
            case "CPL":     outp.bytes = [ 0x2F ]; break;
            case "NEG":     outp.bytes = [ 0xED, 0x44 ]; break;
            case "CCF":     outp.bytes = [ 0x3F ]; break;
            case "SCF":     outp.bytes = [ 0x37 ]; break;
            case "HALT":    outp.bytes = [ 0x76 ]; break;
            case "DI":      outp.bytes = [ 0xF3 ]; break;
            case "EI":      outp.bytes = [ 0xFB ]; break;
            case "IM0":     outp.bytes = [ 0xED, 0x46 ]; break;
            case "IM1":     outp.bytes = [ 0xED, 0x56 ]; break;
            case "IM2":     outp.bytes = [ 0xED, 0x5E ]; break;
            case "RLCA":    outp.bytes = [ 0x07 ]; break;
            case "RLA":     outp.bytes = [ 0x17 ]; break;
            case "RRCA":    outp.bytes = [ 0x0F ]; break;
            case "RRA":     outp.bytes = [ 0x1F ]; break;
            case "RLD":     outp.bytes = [ 0xED, 0x6F ]; break;
            case "RRD":     outp.bytes = [ 0xED, 0x67 ]; break;
            case "RET":     outp.bytes = [ 0xC9 ]; break;
            case "RETNZ":   outp.bytes = [ 0xC0 ]; break;
            case "RETZ":    outp.bytes = [ 0xC8 ]; break;
            case "RETNC":   outp.bytes = [ 0xD0 ]; break;
            case "RETC":    outp.bytes = [ 0xD8 ]; break;
            case "RETPO":   outp.bytes = [ 0xE0 ]; break;
            case "RETPE":   outp.bytes = [ 0xE8 ]; break;
            case "RETP":    outp.bytes = [ 0xF0 ]; break;
            case "RETM":    outp.bytes = [ 0xF8 ]; break;
            case "RETI":    outp.bytes = [ 0xED, 0x4D ]; break;
            case "RETN":    outp.bytes = [ 0xED, 0x45 ]; break;
            case "INI":     outp.bytes = [ 0xED, 0xA2 ]; break;
            case "INIR":    outp.bytes = [ 0xED, 0xB2 ]; break;
            case "IND":     outp.bytes = [ 0xED, 0xAA ]; break;
            case "INDR":    outp.bytes = [ 0xED, 0xBA ]; break;
            case "OUTI":    outp.bytes = [ 0xED, 0xA3 ]; break;
            case "OTIR":    outp.bytes = [ 0xED, 0xB3 ]; break;
            case "OUTD":    outp.bytes = [ 0xED, 0xAB ]; break;
            case "OTDR":    outp.bytes = [ 0xED, 0xBB ]; break;
            case "LD":      this.asmZ80LD(outp); break;
            default:
                this.error(outp, `FIXME: Z80 OP ${inp.str}`);
                break;
        }
    }

    private asmZ80LD(outp: ByteRange) {
        // LD left,right
        const l = this.next_item();
        const c = this.next_item();
        const r = this.next_item();
        if (c.kind !== SyntaxItemKind.Comma) {
            this.error(outp, "comma expected");
            return;
        }
        switch (l.kind) {
            case SyntaxItemKind.Z80R8:
                // LD r,...
                switch (r.kind) {
                    case SyntaxItemKind.Number:
                        // LD r,n
                        if (this.expect_8bit(outp, r.num)) {
                            const lbits = Assembler.z80R8bits(l.str);
                            outp.bytes = [ 0b00000110 | lbits << 3, r.num ];
                        }
                        break;
                    case SyntaxItemKind.Z80R8:
                        // LD r,r'
                        {
                            const lbits = Assembler.z80R8bits(l.str);
                            const rbits = Assembler.z80R8bits(r.str);
                            outp.bytes = [ 0b01000000 | lbits << 3 | rbits ];
                        }
                        break;
                    case SyntaxItemKind.Z80RI:
                        // LD A,I
                        if (l.str === "A") { outp.bytes = [ 0xED, 0x57 ]; }
                        else { this.error(outp, "I can only be loaded into A"); }
                        break;
                    case SyntaxItemKind.Z80RR:
                        // LD A,R
                        if (l.str === "A") { outp.bytes = [ 0xED, 0x5F ]; }
                        else { this.error(outp, "R can only be loaded into A"); }
                        break;
                    case SyntaxItemKind.Z80IndR16:
                        // LD r,(HL) LD A,(BC) LD A,(DE)
                        if (r.str === "HL") {
                            const lbits = Assembler.z80R8bits(l.str);
                            outp.bytes = [ 0b01000110 | lbits << 3 ];
                        }
                        else if (r.str === "BC") {
                            if (l.str === "A") { outp.bytes = [ 0x0A ]; }
                            else { this.error(outp, "(BC) can only be loaded into A"); }
                        }
                        else if (r.str === "DE") {
                            if (l.str === "A") { outp.bytes = [ 0x1A ]; }
                            else { this.error(outp, "(DE) can only be loaded into A"); }
                        }
                        else {
                            this.error(outp, `Invalid indirect load: LD ${l.str},(${r.str})`);
                        }
                        break;
                    case SyntaxItemKind.Z80IndIdx:
                        // LD r,(IX|IY+d)
                        {
                            const lbits = Assembler.z80R8bits(l.str);
                            outp.bytes = [ r.prefix, 0b01000110 | lbits << 3, r.num ];
                        }
                        break;
                    case SyntaxItemKind.Z80IndImm:
                        // LD A,(nn)
                        if (l.str === "A") { outp.bytes = [ 0x3A, r.lo, r.hi ]; }
                        else { this.error(outp, "(nn) can only be loaded into A"); }
                        break;
                    default:
                        this.error(outp, `invalid LD src: ${r.str}`);
                        break;
                }
                break;
            case SyntaxItemKind.Z80RI:
                // LD I,A
                if (r.str === "A") { outp.bytes = [ 0xED, 0x47 ]; }
                else { this.error(outp, "can only load A into I"); }
                break;
            case SyntaxItemKind.Z80RR:
                // LD R,A
                if (r.str === "A") { outp.bytes = [ 0xED, 0x4F ]; }
                else { this.error(outp, "can only A into R"); }
                break;
            case SyntaxItemKind.Z80R16:
                // LD HL/BC/DE/SP/IX/IY,...
                switch (l.str) {
                    case "HL": case "IX": case "IY":
                        // LD HL/IX/IY,nn or LD HL/IX/IY,(nn)
                        if (r.kind === SyntaxItemKind.Number) {
                            if ((l.str === "IX") || (l.str === "IY")) {
                                outp.bytes = [ l.prefix, 0x21, r.lo, r.hi ];
                            }
                            else {
                                outp.bytes = [ 0x21, r.lo, r.hi ];
                            }
                        }
                        else if (r.kind === SyntaxItemKind.Z80IndImm) {
                            if ((l.str === "IX") || (l.str === "IY")) {
                                outp.bytes = [ l.prefix, 0x2A, r.lo, r.hi ];
                            }
                            else {
                                outp.bytes = [ 0x2A, r.lo, r.hi ];
                            }
                        }
                        else {
                            this.error(outp, `invalid src in LD ${l.str},${r.str}`);
                        }
                        break;
                    case "BC": case "DE": case "SP":
                        // LD BC/DE/SP,nn or LD BC/DE/SP,(nn), LD SP,HL/IX/IY
                        if (r.kind === SyntaxItemKind.Number) {
                            const lbits = Assembler.z80R16bits(l.str);
                            outp.bytes = [ 0b00000001 | lbits << 4, r.lo, r.hi ];
                        }
                        else if (r.kind === SyntaxItemKind.Z80IndImm) {
                            const lbits = Assembler.z80R16bits(l.str);
                            outp.bytes = [ 0xED, 0b01001011 | lbits << 4, r.lo, r.hi ];
                        }
                        else if (r.kind === SyntaxItemKind.Z80R16) {
                            // LD SP,HL/IX/IY
                            if (l.str === "SP") {
                                if (r.str === "HL") {
                                    outp.bytes = [ 0xF9 ];
                                }
                                else if ((r.str === "IX") || (r.str === "IY")) {
                                    outp.bytes = [ r.prefix, 0xF9 ];
                                }
                                else {
                                    this.error(outp, `invalid src in LD ${l.str},${r.str}`);
                                }
                            }
                            else {
                                this.error(outp, `invalid dst in LD ${l.str},${r.str}`);
                            }
                        }
                        else {
                            this.error(outp, `invalid src in LD ${l.str},${r.str}`);
                        }
                        break;
                    default:
                        this.error(outp, `invalid dst in LD ${l.str},...`);
                        break;
                }
                break;
            case SyntaxItemKind.Z80IndR16:
                // LD (HL/BC/DE),...
                if (l.str === "HL") {
                    // LD (HL),r or LD (HL),n
                    if (r.kind === SyntaxItemKind.Number) {
                        if (this.expect_8bit(outp, r.num)) {
                            outp.bytes = [ 0x36, r.num ];
                        }
                    }
                    else if (r.kind === SyntaxItemKind.Z80R8) {
                        const rbits = Assembler.z80R8bits(r.str);
                        outp.bytes = [ 0b01110000 | rbits ];
                    }
                    else {
                        this.error(outp, `invalid src in LD (HL),${r.str}`);
                    }
                }
                else if ((l.str === "BC") || (l.str === "DE")) {
                    if ((r.kind === SyntaxItemKind.Z80R8) && (r.str === "A")) {
                        outp.bytes = [ l.str === "BC" ? 0x02 : 0x12 ];
                    }
                    else {
                        this.error(outp, `can only load A into (${l.str})`);
                    }
                }
                else {
                    this.error(outp, `invalid dst in LD (${l.str}),${r.str}`);
                }
                break;
            case SyntaxItemKind.Z80IndIdx:
                // LD (IX/IY+d),r or LD (IX/IY+d),n
                if (r.kind === SyntaxItemKind.Number) {
                    if (this.expect_8bit(outp, r.num)) {
                        outp.bytes = [ l.prefix, 0x36, l.num, r.num ];
                    }
                }
                else if (r.kind === SyntaxItemKind.Z80R8) {
                    const rbits = Assembler.z80R8bits(r.str);
                    outp.bytes = [ l.prefix, 0b01110000 | rbits, l.num ];
                }
                else {
                    this.error(outp, `invalid src in LD (${l.str}+d),${r.str}`);
                }
                break;
            case SyntaxItemKind.Z80IndImm:
                // LD (nn),...
                if ((r.kind === SyntaxItemKind.Z80R8) && (r.str === "A")) {
                    // LD (nn),A
                    outp.bytes = [ 0x32, l.lo, l.hi ];
                }
                else if (r.kind === SyntaxItemKind.Z80R16) {
                    switch (r.str) {
                        case "HL":
                            outp.bytes = [ 0x22, l.lo, l.hi ];
                            break;
                        case "IX": case "IY":
                            outp.bytes = [ r.prefix, 0x22, l.lo, l.hi ];
                            break;
                        case "BC": case "DE": case "SP":
                            { 
                                const rbits = Assembler.z80R16bits(r.str);
                                outp.bytes = [ 0xED, 0b01000011 | rbits << 4, l.lo, l.hi ];
                            }
                            break;
                        default:
                            this.error(outp, `invalid src in LD (nn),${r.str}`);
                    }
                }
                break;
            default:
                this.error(outp, `invalid LD dst: ${l.str}`);
                break;
        }
    }

    private peek_item(): SyntaxItem {
        let item = this.syntaxItems[this.syntaxItemIndex];
        if (item === undefined) {
            item = new SyntaxItem();
            item.kind = SyntaxItemKind.EOF;
        }
        return item;
    }

    private skip_item() {
        this.syntaxItemIndex++;
    }

    private next_item(): SyntaxItem {
        const item = this.peek_item();
        this.skip_item();
        return item;
    }

    private expect_8bit(outp: ByteRange, val: number): boolean {
        if (is_8bit(val)) { return true; }
        else { this.error(outp, "8-bit overflow"); }
    }

    private error(outp: ByteRange, msg: string) {
        outp.discard = true;
        this.errors.push(new Error(msg, outp.line));
    }

}

export class HCAsm {
    public static hello() {
        console.log("Hello HCAsm");
    }
}
