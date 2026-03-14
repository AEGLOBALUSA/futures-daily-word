exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, time: new Date().toISOString() }),
  };
};
