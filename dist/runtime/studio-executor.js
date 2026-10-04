export function createStudioCartFunction(userCode) {
  if (typeof userCode !== 'string') {
    throw new TypeError('Studio cart code must be a string');
  }

  try {
    return new Function(
      `${userCode}
; return {
  init: typeof init !== "undefined" ? init : null,
  update: typeof update !== "undefined" ? update : null,
  draw: typeof draw !== "undefined" ? draw : null,
  render: typeof render !== "undefined" ? render : null
};`
    );
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new SyntaxError(
      `Invalid Studio cart syntax: ${error.message}. Studio executes scripts: declare function init(), update(dt), and draw() without import or export. Use ES modules only for file-based carts.`,
      { cause: error }
    );
  }
}

export function executeStudioCartCode(userCode) {
  return createStudioCartFunction(userCode)();
}
