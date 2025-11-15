// This file patches the Performance.measure() method to guard against known browser bugs that can cause it to throw exceptions in certain scenarios.

(function () {
  try {
    var perf = window.performance;
    if (!perf || typeof perf.measure !== "function" || perf.__patched) return;
    var original = perf.measure.bind(perf);
    perf.__originalMeasure = original;
    perf.measure = function () {
      try {
        return original.apply(perf, arguments);
      } catch (err) {
        var msg = (err && err.message) || "";
        var name = (err && err.name) || "";
        if (
          msg.indexOf("negative time stamp") !== -1 ||
          name === "InvalidAccessError" ||
          name === "SyntaxError"
        ) {
          return;
        }
        throw err;
      }
    };
    perf.__patched = true;
  } catch (_) {
    // ignore
  }
})();
