(function() {
    function moduloOp(roundFn, dividend, divisor) {
        x = +dividend;
        y = +divisor;

        if (
            Number.isNaN(x) ||
            Number.isNaN(y) ||
            Math.abs(x) === Infinity ||
            y === 0
        ) {
            return NaN;
        } else if (
            Math.abs(y) === Infinity ||
            x === 0 // +0 or -0
        ) {
            return x;
        }
        return x - y * roundFn(x / y);
    }

    if (!Math.mod) {
        Math.mod = function(x, y) {
            return moduloOp(Math.floor, x, Math.abs(y));
        };
    }

    if (!Math.floorMod) {
        Math.floorMod = function(x, y) {
            return moduloOp(Math.floor, x, y);
        };
    }
})();
