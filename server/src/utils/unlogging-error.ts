export default class UnloggingError<Field = string> extends Error {
  constructor(message: string, public field?: Field) {
    super(message);
  }
}