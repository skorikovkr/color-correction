export type Point = {
    x: number,
    y: number
}

export class CubicPoly {
    A: number;
    B: number;
    C: number;
    D: number;

	constructor(A : number, B : number, C : number, D : number) {
		this.A = A;
		this.B = B;
		this.C = C;
		this.D = D;
	}

	public evaluateAt (x : number) {
        return this.A * Math.pow(x,3) + this.B * Math.pow(x,2) + this.C*(x) + this.D;
    }
}

export type CubicSplineInterpolationResult = Array<{
	polynomial: CubicPoly,
	range: {
		xmin: number,
		xmax: number
	}
}>

export const cubicSplineInterpolation = (p : Point[]) : CubicSplineInterpolationResult => {
	let row = 0;
	const solutionIndex = (p.length - 1) * 4;

	const m : number[][] = [];
	for (let i = 0; i < (p.length - 1) * 4; i++) {
		m.push([]);
		for (let j = 0; j <= (p.length - 1) * 4; j++) {
			m[i].push(0);
		}
	}

	// splines through p equations
	for (let functionNr = 0; functionNr < p.length-1; functionNr++, row++) {
		const p0 = p[functionNr], p1 = p[functionNr+1];
		m[row][functionNr*4+0] = Math.pow(p0.x, 3);
		m[row][functionNr*4+1] = Math.pow(p0.x, 2); 
		m[row][functionNr*4+2] = p0.x;
		m[row][functionNr*4+3] = 1; 
		m[row][solutionIndex] = p0.y;

		m[++row][functionNr*4+0] = Math.pow(p1.x, 3);
		m[row][functionNr*4+1] = Math.pow(p1.x, 2); 
		m[row][functionNr*4+2] = p1.x;
		m[row][functionNr*4+3] = 1; 
		m[row][solutionIndex] = p1.y;
	}

	// first derivative
	for (let functionNr = 0; functionNr < p.length - 2; functionNr++, row++) {
		const p1 = p[functionNr+1];
		m[row][functionNr*4+0] = 3 * Math.pow(p1.x, 2);
		m[row][functionNr*4+1] = 2 * p1.x;
		m[row][functionNr*4+2] = 1;
		m[row][functionNr*4+4] = -3 * Math.pow(p1.x, 2);
		m[row][functionNr*4+5] = -2 * p1.x;
		m[row][functionNr*4+6] = -1;
	}

	// second derivative
	for (let functionNr = 0; functionNr < p.length - 2; functionNr++, row++) {
		const p1 = p[functionNr+1];
		m[row][functionNr*4+0] = 6 * p1.x;
		m[row][functionNr*4+1] = 2;
		m[row][functionNr*4+4] = -6 * p1.x;
		m[row][functionNr*4+5] = -2;
	}

	m[row][0+0] = 6 * p[0].x;
	m[row++][0+1] = 2;
	m[row][solutionIndex-4+0] = 6 * p[p.length-1].x;
	m[row][solutionIndex-4+1] = 2;

	const reducedRowEchelonForm = rref(m);
	if (reducedRowEchelonForm == null)
		throw new Error("Argument exception error. Matrix cannot be transformed to reduced row echelon form.");
	const coefficients : number[] = [];
	for (var i = 0; i < reducedRowEchelonForm.length; i++) {
		coefficients.push(reducedRowEchelonForm[i][reducedRowEchelonForm[i].length - 1]);
	}

	const polynomials = [];
	for (let i = 0; i < coefficients.length; i += 4) {
		polynomials.push({
			polynomial: new CubicPoly(
				coefficients[i], 
				coefficients[i+1],
				coefficients[i+2],
				coefficients[i+3]
			),
			range: { 
                xmin: p[i/4].x, 
                xmax: p[i/4+1].x 
            }
		})
	}
	return polynomials;
}

// Reduced row echelon form
// Taken from https://rosettacode.org/wiki/Reduced_row_echelon_form
const rref = (mat : number[][]) => {
    var lead = 0;
    for (var r = 0; r < mat.length; r++) {
        if (mat[0].length <= lead) {
            return;
        }
        var i = r;
        while (mat[i][lead] == 0) {
            i++;
            if (mat.length == i) {
                i = r;
                lead++;
                if (mat[0].length == lead) {
                    return;
                }
            }
        }
 
        var tmp = mat[i];
        mat[i] = mat[r];
        mat[r] = tmp;
 
        var val = mat[r][lead];
        for (var j = 0; j < mat[0].length; j++) {
            mat[r][j] = mat[r][j] / val;
        }
 
        for (var i = 0; i < mat.length; i++) {
            if (i == r) continue;
            val = mat[i][lead];
            for (var j = 0; j < mat[0].length; j++) {
                mat[i][j] = mat[i][j] - val * mat[r][j];
            }
        }
        lead++;
    }
    return mat;
}


export const calcBezierControlPoints = (firstPoint : Point, lastPoint : Point, cubicPoly : CubicPoly) : [Point, Point] => {
	const xDiff = lastPoint.x - firstPoint.x;
	const x1 = firstPoint.x + xDiff / 3.0;
	const x2 = firstPoint.x + 2.0 * xDiff / 3.0;

	const y1 = cubicPoly.evaluateAt(x1);
	const y2 = cubicPoly.evaluateAt(x2);

	const f1 = 0.296296296296296296296; // (1-1/3)^3
	const f2 = 0.037037037037037037037; // (1-2/3)^3
	const f3 = 0.296296296296296296296; // (2/3)^3

	const b1 = y1 - firstPoint.y * f1 - lastPoint.y / 27.0;
	const b2 = y2 - firstPoint.y * f2 - f3 * lastPoint.y;

	const c1 = (-2 * b1 + b2) / -0.666666666666666666;
	const c2 = (b2 - 0.2222222222222 * c1) / 0.44444444444444444;

	const p2 : Point = {
		x: x1,
		y: c1
	};
	const p3 : Point  = {
		x: x2,
		y: c2
	};

	return [p2, p3];
};

export const getSVGPathForSpline = (cubicPolynomials: CubicSplineInterpolationResult, points: Point[]) : string => {
	let path = [];
	path.push(`M${points[0].x},${points[0].y}`)
	for (let i = 1; i < points.length; i++) {
	  const controlPoints = calcBezierControlPoints(points[i-1], points[i], cubicPolynomials[i-1].polynomial);
	  path.push(`C ${controlPoints[0].x},${controlPoints[0].y} ${controlPoints[1].x},${controlPoints[1].y} ${points[i].x},${points[i].y}`);
	}
	return path.join(' ');
}

export const evaluateInterpolationAtPoint = (x: number, polynomials: CubicSplineInterpolationResult) => {
	for (let i = 0; i < polynomials.length; i++) {
		if (x <= polynomials[i].range.xmax && x >= polynomials[i].range.xmin) {
			return polynomials[i].polynomial.evaluateAt(x);
		}
	}
	throw new Error("Argument out of range");
}