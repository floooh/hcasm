// KC85 assembler mnemonik: http://www.mpm-kc85.de/dokupack/M027_Development.pdf

function fatal_if(c: boolean, msg: string) {
    if (c) { throw msg; }
}

function fatal(msg: string) {
    throw msg;
}

function is_8bit(val: number) {
    return (val >= -128) && (val <= 255);
}

function is_16bit(val: number) {
    return (val >= -32768) && (val <= 65536);
}

export enum TokenKind {
    Invalid,
    Unknown,
    Error,                  // a low level error during tokenization
    Name,                   // any string
    Number,                 // a number ($ prefix for hex, % prefix for binary)
    String,                 // a string literal (everything between "")
    Comma,                  // ','
    Colon,                  // ':'
    Plus,                   // '+'
    Minus,                  // '-'
    Pound,                  // '#'
    LeftBracket,            // '('
    RightBracket,           // ')'
    EOF,                    // end-of-stream
}

export function TokenKindToString(kind: TokenKind): string {
    switch (kind) {
        case TokenKind.Invalid:         return "Invalid";
        case TokenKind.Unknown:         return "Unknown";
        case TokenKind.Error:           return "Error";
        case TokenKind.Name:            return "Name";
        case TokenKind.Number:          return "Number";
        case TokenKind.String:          return "String";
        case TokenKind.Comma:           return "Comma";
        case TokenKind.Colon:           return "Colon";
        case TokenKind.Plus:            return "Plus";
        case TokenKind.Minus:           return "Minus";
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
        if (isNaN(token.num)) {
            token.kind = TokenKind.Error;
            token.str = "Decimal integer parsing error";
        }
        return token;
    }

    /** return a new number token parsed as hex number */
    public static Hex(src: string, start: number, end: number, line: number): Token {
        const token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.line = line;
        token.num = parseInt(token.str, 16);
        if (isNaN(token.num)) {
            token.kind = TokenKind.Error;
            token.str = "Hexadecimal integer parsing error";
        }
        return token;
    }

    /** return a new number token parsed as binary number */
    public static Binary(src: string, start: number, end: number, line: number): Token {
        const token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.line = line;
        token.num = parseInt(token.str, 2);
        if (isNaN(token.num)) {
            token.kind = TokenKind.Error;
            token.str = "Binary integer parsing error";
        }
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
    private pos: number;
    private start: number;
    private end: number;
    private line: number;
    
    /** tokenize a string into a token array */
    public Tokenize(str: string): Token[] {
        this.src = str;
        this.pos = 0;
        this.start = 0;
        this.end = 0;
        this.line = 0;
        const tokens = new Array<Token>();
        let token = null;
        while (token = this.next_token()) {
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
            else if (c === "-") {
                this.advance_ignore();
                return Token.Tag(TokenKind.Minus, this.line);
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
    "IM":       SyntaxItemKind.Z80Op,
    "INC":      SyntaxItemKind.Z80Op,
    "IND":      SyntaxItemKind.Z80Op,
    "INDR":     SyntaxItemKind.Z80Op,
    "INI":      SyntaxItemKind.Z80Op,
    "INIR":     SyntaxItemKind.Z80Op,
    "JP":      SyntaxItemKind.Z80Op,
    "JR":       SyntaxItemKind.Z80Op,
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
    "RETI":     SyntaxItemKind.Z80Op,
    "RETN":     SyntaxItemKind.Z80Op,
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
    "I":        SyntaxItemKind.Z80RI,
    "R":        SyntaxItemKind.Z80RR,
    "BC":       SyntaxItemKind.Z80R16,
    "DE":       SyntaxItemKind.Z80R16,
    "HL":       SyntaxItemKind.Z80R16,
    "AF":       SyntaxItemKind.Z80R16,
    "IX":       SyntaxItemKind.Z80R16,
    "IY":       SyntaxItemKind.Z80R16,
    "SP":       SyntaxItemKind.Z80R16,
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
                item.lo  = item.num & 0xFF;
                item.hi  = (item.num >> 8) & 0xFF;
                item.is8bit = is_8bit(item.num);
                item.is16bit = is_16bit(item.num);
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
                    item.lo = item.num & 0xFF;
                    item.hi = (item.num >> 8) & 0xFF;
                    item.is8bit = is_8bit(item.num);
                    item.is16bit = is_16bit(item.num);
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
                            if ((token.kind === TokenKind.Plus) || (token.kind === TokenKind.Minus)) {
                                // (IX+d) or (IY+d)
                                const neg = token.kind === TokenKind.Minus;
                                item.kind = SyntaxItemKind.Z80IndIdx;
                                token = this.next_token();
                                if (token.kind === TokenKind.Number) {
                                    item.num = neg ? -token.num : token.num;
                                    item.lo = item.num & 0xFF;
                                    item.hi = 0;
                                    item.is8bit = is_8bit(item.num);
                                    item.is16bit = is_16bit(item.num);
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
                }
                token = this.next_token();
                if (token.kind !== TokenKind.RightBracket) {
                    this.error(item, "expected closing bracket");
                }
            }
            else if (token.kind === TokenKind.Error) {
                this.error(item, token.str);
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

    private static z80ALUbits(alu: string): number {
        switch (alu) {
            case "ADD": return 0b000;
            case "ADC": return 0b001;
            case "SUB": return 0b010;
            case "SBC": return 0b011;
            case "AND": return 0b100;
            case "XOR": return 0b101;
            case "OR":  return 0b110;
            case "CP":  return 0b111;
            default:
                fatal("invalid z80 alu op name!");
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
            else {
                this.error(outp, `Syntax error: ${inp.str}`);
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
            case "RLCA":    outp.bytes = [ 0x07 ]; break;
            case "RLA":     outp.bytes = [ 0x17 ]; break;
            case "RRCA":    outp.bytes = [ 0x0F ]; break;
            case "RRA":     outp.bytes = [ 0x1F ]; break;
            case "RLD":     outp.bytes = [ 0xED, 0x6F ]; break;
            case "RRD":     outp.bytes = [ 0xED, 0x67 ]; break;
            case "RET":     outp.bytes = [ 0xC9 ]; break;
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
            case "LD":
                this.asmZ80LD(outp);
                break;
            case "ADD": case "ADC": case "SUB": case "SBC":
            case "AND": case "XOR": case "OR": case "CP":
                this.asmZ80ALU(inp.str, outp);
                break;
            default:
                this.error(outp, `FIXME: Z80 OP ${inp.str}`);
                break;
        }
    }

    private asmZ80ALU(alu: string, outp: ByteRange) {
        const l = this.next_item();
        // 16-bit operation?
        if (l.kind === SyntaxItemKind.Z80R16) {
            // FIXME
            this.error(outp, "FIXME: 16-bit ALU operation");
        }
        else {
            const alubits = Assembler.z80ALUbits(alu);
            switch (l.kind) {
                case SyntaxItemKind.Number:
                    // ALU n
                    if (this.expect_8bit(outp, l)) {
                        outp.bytes = [ 0b11000110 | alubits << 3, l.lo ];
                    }
                    break;
                case SyntaxItemKind.Z80R8:
                    // ALU r
                    const rbits = Assembler.z80R8bits(l.str);
                    outp.bytes = [ 0b10000000 | alubits << 3 | rbits ];
                    break;
                case SyntaxItemKind.Z80IndR16:
                    // ALU (HL)
                    if (this.expect_iHL(outp, l)) {
                        outp.bytes = [ 0b10000110 | alubits << 3];
                    }
                    break;
                case SyntaxItemKind.Z80IndIdx:
                    // ALU (IX|IY+d)
                    outp.bytes = [ l.prefix, 0b10000110 | alubits << 3, l.lo ];
                    break;
                default:
                    this.error(outp, `invalid 8-bit ALU operand: ${l.str}`);
                    break;
            }
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
                        if (this.expect_8bit(outp, r)) {
                            const lbits = Assembler.z80R8bits(l.str);
                            outp.bytes = [ 0b00000110 | lbits << 3, r.lo ];
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
                            outp.bytes = [ r.prefix, 0b01000110 | lbits << 3, r.lo ];
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
                        if (this.expect_8bit(outp, r)) {
                            outp.bytes = [ 0x36, r.lo ];
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
                    if (this.expect_8bit(outp, r)) {
                        outp.bytes = [ l.prefix, 0x36, l.lo, r.lo ];
                    }
                }
                else if (r.kind === SyntaxItemKind.Z80R8) {
                    const rbits = Assembler.z80R8bits(r.str);
                    outp.bytes = [ l.prefix, 0b01110000 | rbits, l.lo ];
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

    private expect_8bit(outp: ByteRange, item: SyntaxItem): boolean {
        if (item.is8bit) { return true; }
        else { this.error(outp, "8-bit overflow"); }
    }

    private expect_iHL(outp: ByteRange, item: SyntaxItem): boolean {
        if ((item.kind === SyntaxItemKind.Z80IndR16) && (item.str === "HL")) {
            return true;
        }
        else {
            this.error(outp, "expected (HL)");
        }
    }

    private error(outp: ByteRange, msg: string) {
        outp.discard = true;
        this.errors.push(new Error(msg, outp.line));
    }
}

/** bundle byte ranges into blobs */
export class Bundler {

    public BundleRaw(ranges: ByteRange[]): Uint8Array {
        let len = 0;
        for (const rng of ranges) {
            len += rng.bytes.length;
        }
        const outp = new Uint8Array(len);
        let index = 0;
        for (const rng of ranges) {
            for (const byte of rng.bytes) {
                outp[index++] = byte;
            }
        }
        return outp;
    }
}

export class HCAsm {
    
    public static AsmRaw(src: string): Uint8Array|null {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const assembler = new Assembler();
        const bundler = new Bundler();
        const tokens = tokenizer.Tokenize(src);
        const syntaxItems = parser.Parse(tokens);
        if (parser.HasErrors()) {
            parser.PrintErrors();
            return null;
        }
        const byteRanges = assembler.Assemble(syntaxItems);
        if (assembler.HasErrors()) {
            assembler.PrintErrors();
            return null;
        }
        const outp = bundler.BundleRaw(byteRanges);
        return outp;
    }

    public static hello() {
        console.log("Hello HCAsm");
    }
}
