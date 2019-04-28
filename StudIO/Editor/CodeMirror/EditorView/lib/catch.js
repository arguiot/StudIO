/*****************************************************

	                    Catch
	=================================================
	Copyright © Arthur Guiot 2018. All right reserved.

******************************************************/
class Catch {
  browser(handler) {
    if (window) {
      window.onerror = (messageOrEvent, source, noligne, nocolonne, erreur) => {
        const obj = {
          err: messageOrEvent,
          src: source,
          line: noligne,
          column: nocolonne,
          errObj: erreur,
          time: new Date().toString(),
          userAgent: window.navigator.userAgent
        };
        this.errors.push(obj);
        handler(obj);
      };
    }
  }
  constructor(handler) {
    this.version = "v0.0.1"; // Catch version

    this.listen(handler);

    this.errors = [];
  }
  listen(handler) {
    if (typeof module !== "undefined" && module.exports) {
      this.node(handler);
    } else {
      this.browser(handler);
    }
  }
  node(handler) {
    if (process) {
      process.on("uncaughtException", err => {
        const obj = {
          err: err,
          time: new Date().toString()
        };
        this.errors.push(obj);
        handler(obj);
      });
    }
  }
}
// Browserify / Node.js
if (typeof define === "function" && define.amd) {
  define(() => new Catch());
  // CommonJS and Node.js module support.
} else if (typeof exports !== "undefined") {
  // Support Node.js specific `module.exports` (which can be a function)
  if (typeof module !== "undefined" && module.exports) {
    exports = module.exports = new Catch();
  }
  // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
  exports.Catch = new Catch();
} else if (typeof global !== "undefined") {
  global.Catch = new Catch();
}
