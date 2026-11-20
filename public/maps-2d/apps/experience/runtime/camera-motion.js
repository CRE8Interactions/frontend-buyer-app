// Slow pull-out and arrival, with a faster uninterrupted sweep between them.
// Zero velocity and acceleration at the endpoints avoid a kick on section focus.
export function cameraEase(value) {
 const t=Math.max(0,Math.min(1,value));
 return t*t*t*(t*(t*6-15)+10);
}

// Blend two zero-velocity curves. This keeps the deliberate seat-view easing
// while reducing the sharp mid-journey acceleration of the higher-order curve.
export function seatTravelEase(value){const t=Math.max(0,Math.min(1,value)),soft=t*t*t*(t*(t*6-15)+10),slow=t*t*t*t*(35+t*(-84+t*(70-20*t)));return soft*.58+slow*.42;}

// A return samples the same route, including when interrupted partway through.
export function seatTravelProgress(time, reverseStart=null){
 const progress=seatTravelEase(time);
 return reverseStart===null?progress:reverseStart*(1-progress);
}
