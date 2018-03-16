
export enum TokenKind {
    Invalid = "Invalid",
    Error = "Error",        // str is error description
    Control = "Control",    // .org, .db, ...
    Name = "Name",          // any string
    Number = "Number",      // [$|%]1..F[h|H|b|B]
    Label = "Label",        // xxx:
    Comma = "Comma",        // ','
    Imm = "Imm",            // '#'
    Open = "Open",          // '('
    Close = "Close",        // ')'
    Comment = "Comment",    // ';' to end of line
    End = "End"             // end of input stream
};

export class Token {
    kind: TokenKind = TokenKind.Invalid;
    start: number = 0;
    end: number = 0;
    str: string = '';
    val: number = 0;

    toString(): string {
        return `${ this.kind }: ${ this.str }`
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
    return (c == ' ') || (c == '\t') || (c == '\r') || (c == '\n');
}

export class Tokenizer {
    private str: string;
    private pos: number = 0;
    
    token: Token;

    constructor(str: string) {
        this.str = str;
    }

    private peek(): string {
        return this.str[this.pos];
    }
    private pop(): string {
        return this.str[this.pos++];
    }
    next(): boolean {
        this.token = new Token();
        while (this.token.kind == TokenKind.Invalid) {
            this.token.start = this.token.end = this.pos;
            let c = this.peek();
            if (c == undefined) {
                this.token.kind = TokenKind.End;
                return false;
            }
            if (c == '$') {
                this.pop();
                this.token.start++;
                this.token.end++;
                while (isHexDigit(this.peek())) {
                    this.token.end++;
                    this.pop();
                }
                this.token.kind = TokenKind.Number;
                this.token.str = this.str.slice(this.token.start, this.token.end).toUpperCase();
            }
            else if (c == '%') {
                this.pop();
                this.token.start++;
                this.token.end++;
                while (isHexDigit(this.peek())) {
                    this.token.end++;
                    this.pop();
                }
                this.token.kind = TokenKind.Number;
                this.token.str = this.str.slice(this.token.start, this.token.end).toUpperCase();
            }
            else if (isDecDigit(c)) { // a decimal number
                while (isDecDigit(this.peek())) {
                    this.token.end++;
                    this.pop();
                }
                this.token.kind = TokenKind.Number;
                this.token.str = this.str.slice(this.token.start, this.token.end).toUpperCase();
            }
            else if (c == ',') {
                this.pop();
                this.token.kind = TokenKind.Comma;
            }
            else if (c == '#') {
                this.pop();
                this.token.kind = TokenKind.Imm;
            }
            else if (c == '(') {
                this.pop();
                this.token.kind = TokenKind.Open;
            }
            else if (c == ')') {
                this.pop();
                this.token.kind = TokenKind.Close;
            }
            else if (c == '.') {
                this.token.start++;
                this.token.end++;
                this.pop();
                while (isAlnum(this.peek())) {
                    this.token.end++;
                    this.pop();
                }
                this.token.kind = TokenKind.Control;
                this.token.str = this.str.slice(this.token.start, this.token.end).toUpperCase();
            }
            else if (c == ';') {
                while (!isLineEnd(this.pop())) {
                    this.token.end++;
                }
                this.token.str = this.str.slice(this.token.start, this.token.end);
            }
            else if (isAlnum(c)) {
                while (isAlnum(this.peek())) {
                    this.token.end++;
                    this.pop();
                }
                if (this.peek() == ':') {
                    this.pop();
                    this.token.kind = TokenKind.Label;
                }
                else {
                    this.token.kind = TokenKind.Name;
                }
                this.token.str = this.str.slice(this.token.start, this.token.end); 
            }
            else {
                while (isWhiteSpace(this.peek())) {
                    this.pop();
                }
            }
        }
        return true;
    }
}

export class HCAsm {
    static hello() {
        console.log("Hello HCAsm");
    }
}
