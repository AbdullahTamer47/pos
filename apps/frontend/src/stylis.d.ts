declare module 'stylis' {
  function stylis(...args: unknown[]): unknown;
  export default stylis;
  export const prefixer: (context: number, content: string) => string | void;
}