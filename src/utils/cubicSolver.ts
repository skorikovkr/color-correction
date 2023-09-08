export function cuberoot(x : number) : number {
    let y = Math.pow(Math.abs(x), 1/3);
    return x < 0 ? -y : y;
}

export function solveCubic(A : number, B : number, C : number, D : number) {
    if (Math.abs(A) < 1e-8) {
        A = B; B = C; C = D;
        if (Math.abs(A) < 1e-8) {
            A = B; B = C;
            if (Math.abs(A) < 1e-8)
                return [];
            return [-B/A];
        }

        let Discr = B*B - 4*A*C;
        if (Math.abs(Discr) < 1e-8)
            return [-B/(2*A)];
        else if (Discr > 0)
            return [(-B+Math.sqrt(Discr))/(2*A), (-B-Math.sqrt(Discr))/(2*A)];
        return [];
    }

    let p = (3*A*C - B*B)/(3*A*A);
    let q = (2*B*B*B - 9*A*B*C + 27*A*A*D)/(27*A*A*A);
    let roots;

    if (Math.abs(p) < 1e-8) { 
        roots = [cuberoot(-q)];
    } else if (Math.abs(q) < 1e-8) { 
        roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
    } else {
        let Discr = q*q/4 + p*p*p/27;
        if (Math.abs(Discr) < 1e-8) {
            roots = [-1.5*q/p, 3*q/p];
        } else if (Discr > 0) {
            let u = cuberoot(-q/2 - Math.sqrt(Discr));
            roots = [u - p/(3*u)];
        } else {                        
            let u = 2*Math.sqrt(-p/3);
            let t = Math.acos(3*q/p/u)/3;
            let k = 2*Math.PI/3;
            roots = [u*Math.cos(t), u*Math.cos(t-k), u*Math.cos(t-2*k)];
        }
    }
    
    for (let i = 0; i < roots.length; i++)
        roots[i] -= B/(3*A);

    return roots;
}