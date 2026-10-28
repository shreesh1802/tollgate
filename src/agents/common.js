/** One tool call, with the retry-once-on-transient-error habit real agent loops have. */
export async function act(gw, tool, args) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gw.call(tool, args);
    } catch (err) {
      if (err.transient && attempt === 0) continue;
      return { decision: 'ERROR', error: err.message };
    }
  }
}
