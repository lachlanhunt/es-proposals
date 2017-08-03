# Proposal: Modular Arithmetic

ECMAScript's remainder operator (`%`), commonly referred to as "mod" by developers, differs from the mathematical modulo operation in a significant way, which can lead to bugs in common algorithms if care is not taken. This proposal outlines the problems with the remainder operator and explores the options for adding support for real modular arithmetic to ECMAScript.

## Status

**Stage**: 0  

_For more information see the [TC39 proposal process](https://tc39.github.io/process-document/)._

## Author

* Lachlan Hunt (@Lachy)

# Motivations

The remainder operator (`%`) returns the remainder of the dividend (x) after division by the divisor (y)

```javascript
let r = x % y
```

Where both `x` and `y` are positive, this gives the expected result. But for negative values, the sequence is completely inconsistent.

    x ≥ 0 ⇒   0  ≤ r < |y|
    x < 0 ⇒ -|y| < r ≤  0

On a number line, this looks like:

|   x   |...| -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 |...|
|:-----:|--:|---:|---:|---:|---:|---:|---:|---:|--:|--:|--:|--:|--:|--:|--:|--:|
|(mod 4)|...| -3 | -2 | -1 |  0 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 0 | 1 | 2 |...|

This result can be a cause of bugs in many common mathematical functions and algorithms if care is not taken.

1. A number is odd where a mod 2 is 1

    ```javascript
    isOdd = (x) => x % 2 === 1
    ```

    This would work fine for positive values of `x`, but breaks when `x` is negative, as the result for negative odd numbers is -1.  A correct implementation using `%` for this would need to either (a) check that the result is not 0 (even), (b) check for both 1 or -1, or (c) calculate `abs(x % 2)`

    ```javascript
    isOdd = (x) => x % 2 !== 0
    ```
2. Slideshow progress
    See http://www.sitecrafting.com/blog/modulus-remainder/
3. [Other issues to come...]

# Previous Discussions

Some [previous discussion of introducing a `mod` operator](http://web.archive.org/web/20160305115235/http://wiki.ecmascript.org/doku.php?id=strawman:modulo_operator) appears to have disappeared from the radar.

# Modulo Algorithms

The expected result from a modulo operation should continue the pattern infinitely in both directions.

|   x   |...| -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 |...|
|:-----:|--:|---:|---:|---:|---:|---:|---:|---:|--:|--:|--:|--:|--:|--:|--:|--:|
|(mod 4)|...|  1 |  2 |  3 |  0 |  1 |  2 |  3 | 0 | 1 | 2 | 3 | 0 | 1 | 2 |...|

The remainder is calculated by

    r = x mod y
      = x - yq

Where `x` is the dividend, `y` is the divisor and `q` is the integral quotient of `x / y` obtained by rounding using a particular rounding function.

There are 3 alternative algorithms to consider:

1. Knuth's floored division algorithm [1], where the sign of the remainder matches the divisor.
2. Euclidian algorithm, where the remainder is always positive.
as the sign of the divisor.
3. Truncation division, where the sign of the remainder matches the sign of the dividend. (This is ECMAScript's existing remainder operator, included for comparison only.)

> Note: Other algorithms utilising various other rounding functions, such as IEEE 754's remainder function using round to nearest, ties to even; or those using ceiling functions, etc. are not being considered because their results are highly unusual and have limited use cases.

### Knuth's floored division algorithm

    x mod y = x - y · ⌊x ∕ y⌋

ECMAScript:

```javascript
const floorMod = (x, y) => x - y * Math.floor(x / y);
```

The result with both positive and negative divisors is:

|   x    |...| -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 |  1 |  2 |  3 | 4 |  5 |  6 |...|
|:------:|--:|---:|---:|---:|---:|---:|---:|---:|--:|---:|---:|---:|--:|---:|---:|--:|
|(mod  4)|...|  1 |  2 |  3 |  0 |  1 |  2 |  3 | 0 |  1 |  2 |  3 | 0 |  1 |  2 |...|
|(mod -4)|...| -3 | -2 | -1 |  0 | -3 | -2 | -1 | 0 | -3 | -2 | -1 | 0 | -3 | -2 |...|

### Euclidian algorithm

    x mod y = x - |y| · ⌊x ∕ |y|⌋

ECMAScript:

```javascript
const euclidianMod = (x, y) => x - Math.abs(y) * Math.floor(x / Math.abs(y));
```
> Note: The trivial ECMAScript implementations in this section are for illustrative purposes only and do not correctly handle positive or negative `Infinity` used as the divisor. See the Polyfill section below for a more complete implementation.

The result with both positive and negative divisors is:

|   x    |...| -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 |...|
|:------:|--:|---:|---:|---:|---:|---:|---:|---:|--:|--:|--:|--:|--:|--:|--:|--:|
|(mod  4)|...|  1 |  2 |  3 |  0 |  1 |  2 |  3 | 0 | 1 | 2 | 3 | 0 | 1 | 2 |...|
|(mod -4)|...|  1 |  2 |  3 |  0 |  1 |  2 |  3 | 0 | 1 | 2 | 3 | 0 | 1 | 2 |...|

Like Knuth's algorithm, this also uses floored division, but with the critical difference being that the Euclidian algorithm uses the absolute value of the divisor. The result of this is that while the floored division algorithm takes the sign of the divisor, the Euclidian algorithm is always positive.

The similarity means that:

```javascript
euclidianMod(x, y) === floorMod(x, Math.abs(y));
```

In [a paper published in 1992](https://pdfs.semanticscholar.org/2209/353dbdc29032187f19eec4225c702a926b02.pdf "The Euclidean definition of the functions div and mod"), Raymond T. Boute [2] has previously argued that the Euclidian algorithm is the most useful mathematically, but acknowledges that the floored division algorithm also has its merits. (In the following quote, The "F- and E-defintions" refers to the Floored division and Euclidian algorithms, respectively.)

> For comparing the F- and E-definitions, we consider the mod d function as mapping any number onto a unique representative in its equivalence class modulo d. Unless this unique representative is zero, it has the same sign as d with the F-definition and is always positive with the E-definition. Hence the F-definition is slightly more information-preserving w.r.t. the sign of d. On the other hand, in view of regularity one might prefer not letting the sign of the representative depend on the sign of d. In fact, the definition of = d suggests the opposite; since the sign of k in the equality x – y = k “ d has no impact on the sign of the unique representative, there appears little reason for letting the sign of d influence the choice (although the roles of k and d are not really symmetrical: in view of the variable bindings, d is free and k is existentially quantified). This nonnegative unique representative criterion leads to a preference for definition E.

### Truncation algorithm (remainder)

    x rem y = x - y · trunc(x ∕ y)

ECMAScript:

```javascript
    const rem = (x, y) => x % y;
```

|   x    |...| -7 | -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 |...|
|:------:|--:|---:|---:|---:|---:|---:|---:|---:|--:|--:|--:|--:|--:|--:|--:|--:|
|(mod  4)|...| -3 | -2 | -1 |  0 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 0 | 1 | 2 |...|
|(mod -4)|...| -3 | -2 | -1 |  0 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 0 | 1 | 2 |...|

In this case, the result does not change for negative divisors and is inconsistent for positive and negative dividends.

# Other Programming Languages

In choosing the most appropriate algorithm and evaluating potential options for addressing this issue, it is useful to consider what other programming languages and systems support.

## Support for Knuth's floored division algorithm

| Language       | Operator           | Notes |
|----------------|--------------------|-------|
| Java 8         | `Math.floorMod()`  | Also has Math.floorDiv() method. |
| CoffeeScript   | `%%`               |       |
| Haskell        | `mod`              |       |
| Scheme         | `modulo`           | Also has `mod` for Euclidian algorithm |
| Google calculator | `mod`, `%`      |       |
| Wolfram Alpha  | `mod()`, `%`, `mod`| Similarly in Mathematica |

It should also be noted that several algorithms within the ECMAScript specification use a *modulo* operation defined consistently with the floored division algorithm:

> The notation “x modulo y” (y must be finite and nonzero) computes a value k of the same sign as y (or zero) such that abs(k) < abs(y) and x-k = q × y for some integer q.

## Support for Euclidian algorithm

| Language       | Operator           |
|----------------|--------------------|
| Scheme         | `mod`              |
| Dart           | `%`                |
| Pascal         | `mod`              |

These lists are not exhaustive. [Wikipedia Modulo operation](https://en.wikipedia.org/wiki/Modulo_operation) has a more complete list.

They serve to illustrate the various options to be considered for either operators or functions. Of the two algorithm options Knuth's algorithm is, by far, the most common. But even so, some modern languages like Dart have opted for the Euclidian algorithm.

# Proposal

Depending on the chosen algorithm (Euclidian or Floored division), there are several options available for addressing the use issues and use cases presented.

1. Adding one or more functions to the `Math` object. e.g. `Math.mod` or `Math.floorMod`, or both.
2. Adding a new infix operator. e.g. `%%` or `mod`

## Math.mod(x, y) and/or Math.floorMod(x, y)

The advantage of having a method on the Math object is that it's very easy to be polyfilled, and may be used directly as a callback function for, e.g. `map` or `reduce`.

For the name, my own preference is that `Math.mod` be used if the Euclidian algorithm is chosen, and `Math.floorMod` if the floored division algorithm is chosen.

> Note: Although not the primary focus of this proposal, it may also be worth considering adding a `Math.floorDiv()` method for floored division, similar to that in Java 8, which was introduced together with Java's `Math.floorMod()` method.  Some other languages, such as Python include a floor division operator `//` for this purpose.

## Infix operator

Two options are potentially suitable: `%%` or `mod`, subject to compatibility with parsing requirements.  If `%%` is chosen, it is worth keeping in mind CoffeeScript's use of the floored division algorithm.

# Polyfill

This polyfill provides implementations of both the Euclidian (`Math.mod`) and floored division (`Math.floorMod`) algorithms. The handling of `NaN`, positive and negative `Infinity` and `0` is consistent with the requirements for the remainder operator (`%`). This is written to make the algorithms clear, rather than being concerned with performance.

```javascript
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
```

# References

1. Knuth, Donald. E. (1972). [The Art of Computer Programming](http://broiler.astrometry.net/~kilian/The_Art_of_Computer_Programming%20-%20Vol%201.pdf). Addison-Wesley.
2.  Boute, Raymond T. (April 1992). "[The Euclidean definition of the functions div and mod](https://pdfs.semanticscholar.org/2209/353dbdc29032187f19eec4225c702a926b02.pdf)". ACM Transactions on Programming Languages and Systems. ACM Press (New York, NY, USA). 14 (2): 127–144. doi:10.1145/128861.128862.
