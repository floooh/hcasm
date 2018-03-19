
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
    val: number = 0;
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
        token.val = parseInt(token.str, 10);
        fatal_if(isNaN(token.val), `internal error: failed to parse ${token.str} as integer`);
        return token;
    }

    /** return a new number token parsed as hex number */
    static Hex(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.val = parseInt(token.str, 16);
        fatal_if(isNaN(token.val), `internal error: failed to parse ${token.str} as hex`);
        return token;
    }

    /** return a new number token parsed as binary number */
    static Binary(src: string, start: number, end: number, lineNr: number): Token {
        let token = new Token();
        token.kind = TokenKind.Number;
        token.str = src.slice(start, end).toUpperCase();
        token.lineNr = lineNr;
        token.val = parseInt(token.str, 2);
        fatal_if(isNaN(token.val), `internal error: failed to parse ${token.str} as binary`);
        return token;
    }

    /** return a human-readable string with the token state (for debugging) */
    ToString(): string {
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
                return Token.Hex(this.src, this.start, this.end, this.lineNr);
            }
            else if (c == '%') {
                this.advance_skip();
                while (isBinDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Binary(this.src, this.start, this.end, this.lineNr);
            }
            else if (isDecDigit(c)) { // a decimal number
                while (isDecDigit(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Decimal(this.src, this.start, this.end, this.lineNr);
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
                return Token.String(this.src, this.start, this.end, this.lineNr);
            }
            else if (c == ',') {
                this.advance_ignore();
                return Token.Tag(TokenKind.Comma, this.lineNr);
            }
            else if (c == '#') {
                this.advance_ignore();
                return Token.Tag(TokenKind.Imm, this.lineNr);
            }
            else if (c == '(') {
                this.advance_ignore();
                return Token.Tag(TokenKind.LeftBracket, this.lineNr);
            }
            else if (c == ')') {
                this.advance_ignore();
                return Token.Tag(TokenKind.RightBracket, this.lineNr);
            }
            else if (c == '.') {
                this.advance_skip();
                while (isAlnum(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Name(TokenKind.Control, this.src, this.start, this.end, this.lineNr);
            }
            else if (c == ';') {
                while (!isLineEnd(this.cur_char())) {
                    this.advance_take();
                }
                return Token.Name(TokenKind.Comment, this.src, this.start, this.end, this.lineNr);
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
                return Token.Name(kind, this.src, this.start, this.end, this.lineNr);
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
                return Token.Tag(TokenKind.Unknown, this.lineNr);
            }
        }
    }
}

enum CPU {
    Z80,
    M6502,
}

/**
 * A span is what the parser produces, basically a range of bytes
 * (CPU instructions or raw byte sequences).
 */
export class Span {
    valid: boolean = false;
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
            if (item.valid) {
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
        item.valid = true;
        switch (this.token.str) {
            /* simple mnemonics without args */
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
                this.error(`Invalid Z80 instruction: ${ this.token.str }`)
                item.valid = false;
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
