use std::cell::RefCell;

fn clamp(value: f32, min: f32, max: f32) -> f32 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

fn clamp01(value: f32) -> f32 {
    clamp(value, 0.0, 1.0)
}

#[derive(Clone)]
struct VoiceCoreState {
    sample_rate: f32,
    hp_alpha: f32,
    speech_lp_alpha: f32,
    rumble_lp_alpha: f32,
    hp_prev_input: f32,
    hp_prev_output: f32,
    lp_speech: f32,
    lp_rumble: f32,
    hp_scratch: Vec<f32>,
    speech_scratch: Vec<f32>,
    rumble_scratch: Vec<f32>,
}

impl VoiceCoreState {
    fn new(sample_rate: f32) -> Self {
        let safe_sample_rate = sample_rate.max(8000.0);
        let mut state = Self {
            sample_rate: safe_sample_rate,
            hp_alpha: 0.0,
            speech_lp_alpha: 0.0,
            rumble_lp_alpha: 0.0,
            hp_prev_input: 0.0,
            hp_prev_output: 0.0,
            lp_speech: 0.0,
            lp_rumble: 0.0,
            hp_scratch: Vec::new(),
            speech_scratch: Vec::new(),
            rumble_scratch: Vec::new(),
        };
        state.update_coefficients();
        state
    }

    fn update_coefficients(&mut self) {
        let dt = 1.0 / self.sample_rate;
        let highpass_hz = 100.0;
        let speech_lowpass_hz = 3600.0;
        let rumble_lowpass_hz = 170.0;

        let hp_rc = 1.0 / (2.0 * std::f32::consts::PI * highpass_hz);
        self.hp_alpha = hp_rc / (hp_rc + dt);

        let speech_rc = 1.0 / (2.0 * std::f32::consts::PI * speech_lowpass_hz);
        self.speech_lp_alpha = dt / (speech_rc + dt);

        let rumble_rc = 1.0 / (2.0 * std::f32::consts::PI * rumble_lowpass_hz);
        self.rumble_lp_alpha = dt / (rumble_rc + dt);
    }

    fn ensure_scratch_size(&mut self, frame_size: usize) {
        if self.hp_scratch.len() < frame_size {
            self.hp_scratch.resize(frame_size, 0.0);
        }
        if self.speech_scratch.len() < frame_size {
            self.speech_scratch.resize(frame_size, 0.0);
        }
        if self.rumble_scratch.len() < frame_size {
            self.rumble_scratch.resize(frame_size, 0.0);
        }
    }
}

thread_local! {
    static STATE: RefCell<VoiceCoreState> = RefCell::new(VoiceCoreState::new(48_000.0));
    static METRICS: RefCell<[f32; 4]> = RefCell::new([0.0; 4]);
}

#[no_mangle]
pub extern "C" fn ve_init(sample_rate: f32) {
    STATE.with(|state_cell| {
        *state_cell.borrow_mut() = VoiceCoreState::new(sample_rate);
    });
}

#[no_mangle]
pub extern "C" fn ve_reset() {
    STATE.with(|state_cell| {
        let sample_rate = state_cell.borrow().sample_rate;
        *state_cell.borrow_mut() = VoiceCoreState::new(sample_rate);
    });
    METRICS.with(|metrics_cell| {
        *metrics_cell.borrow_mut() = [0.0; 4];
    });
}

#[no_mangle]
pub extern "C" fn ve_get_metrics_ptr() -> u32 {
    METRICS.with(|metrics_cell| metrics_cell.as_ptr() as u32)
}

#[no_mangle]
pub extern "C" fn ve_alloc_f32(length: u32) -> u32 {
    let mut values = Vec::<f32>::with_capacity(length as usize);
    let ptr = values.as_mut_ptr();
    std::mem::forget(values);
    ptr as u32
}

#[no_mangle]
pub extern "C" fn ve_free_f32(ptr: u32, capacity: u32) {
    if ptr == 0 || capacity == 0 {
        return;
    }
    unsafe {
        let _ = Vec::<f32>::from_raw_parts(ptr as *mut f32, 0, capacity as usize);
    }
}

#[no_mangle]
pub extern "C" fn ve_analyze_frame(input_ptr: u32, frame_size: u32) {
    if input_ptr == 0 || frame_size == 0 {
        METRICS.with(|metrics_cell| {
            *metrics_cell.borrow_mut() = [0.0; 4];
        });
        return;
    }

    let input = unsafe { std::slice::from_raw_parts(input_ptr as *const f32, frame_size as usize) };

    STATE.with(|state_cell| {
        let mut state = state_cell.borrow_mut();
        state.ensure_scratch_size(frame_size as usize);

        let mut sum_squares = 0.0f32;
        let mut total_energy = 1e-7f32;
        let mut voice_energy = 0.0f32;
        let mut rumble_energy = 0.0f32;
        let mut zero_crossings = 0.0f32;
        let mut last_sign = 0i32;

        for (index, sample) in input.iter().copied().enumerate() {
            let highpassed = state.hp_alpha * (state.hp_prev_output + sample - state.hp_prev_input);
            state.hp_prev_input = sample;
            state.hp_prev_output = highpassed;

            state.lp_speech += state.speech_lp_alpha * (highpassed - state.lp_speech);
            state.lp_rumble += state.rumble_lp_alpha * (sample - state.lp_rumble);

            let speech_band = state.lp_speech;
            let rumble_band = state.lp_rumble;

            state.hp_scratch[index] = highpassed;
            state.speech_scratch[index] = speech_band;
            state.rumble_scratch[index] = rumble_band;

            let hp_energy = highpassed * highpassed;
            sum_squares += hp_energy;
            total_energy += hp_energy;
            voice_energy += speech_band * speech_band;
            rumble_energy += rumble_band * rumble_band;

            let sign = if highpassed > 0.0025 {
                1
            } else if highpassed < -0.0025 {
                -1
            } else {
                0
            };
            if index > 0 && sign != 0 && last_sign != 0 && sign != last_sign {
                zero_crossings += 1.0;
            }
            if sign != 0 {
                last_sign = sign;
            }
        }

        let frame_len = frame_size as f32;
        let rms = (sum_squares / frame_len).sqrt();
        let voice_ratio = voice_energy / total_energy;
        let rumble_ratio = rumble_energy / total_energy;
        let zcr = clamp01(zero_crossings / frame_len);

        METRICS.with(|metrics_cell| {
            *metrics_cell.borrow_mut() = [rms, clamp01(voice_ratio), clamp01(rumble_ratio), zcr];
        });
    });
}

#[no_mangle]
pub extern "C" fn ve_render_frame(
    output_ptr: u32,
    frame_size: u32,
    suppression_gain: f32,
    presence_lift: f32,
    rumble_reduction: f32,
    saturation_drive: f32,
) {
    if output_ptr == 0 || frame_size == 0 {
        return;
    }

    let output = unsafe { std::slice::from_raw_parts_mut(output_ptr as *mut f32, frame_size as usize) };
    let safe_suppression_gain = clamp(suppression_gain, 0.0, 1.2);
    let safe_presence_lift = clamp(presence_lift, 0.0, 0.8);
    let safe_rumble_reduction = clamp(rumble_reduction, 0.0, 0.9);
    let safe_saturation_drive = clamp(saturation_drive, 0.5, 2.8);
    let saturation_normalizer = safe_saturation_drive.tanh().max(1e-5);

    STATE.with(|state_cell| {
        let state = state_cell.borrow();
        let frame_len = frame_size as usize;
        if state.hp_scratch.len() < frame_len
            || state.speech_scratch.len() < frame_len
            || state.rumble_scratch.len() < frame_len
        {
            for sample in output.iter_mut() {
                *sample = 0.0;
            }
            return;
        }

        for index in 0..frame_len {
            let mut y = state.hp_scratch[index];
            y += state.speech_scratch[index] * safe_presence_lift;
            y -= state.rumble_scratch[index] * safe_rumble_reduction;
            y *= safe_suppression_gain;
            y = (y * safe_saturation_drive).tanh() / saturation_normalizer;
            output[index] = y;
        }
    });
}
