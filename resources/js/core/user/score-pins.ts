// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

import SoloScoreJson from 'interfaces/solo-score-json';
import { route } from 'laroute';
import { action, makeObservable, observable, runInAction } from 'mobx';

export default class ScorePins {
  @observable pins = new Map<SoloScoreJson['id'], boolean>();

  constructor() {
    makeObservable(this);
  }

  apiPin(score: SoloScoreJson, toPin: boolean) {
    const pin = score.current_user_attributes.pin;
    if (pin == null) {
      throw new Error("can't pin score without current user attributes");
    }

    return $.ajax(route('score-pins.store'), {
      data: pin,
      dataType: 'json',
      method: toPin ? 'POST' : 'DELETE',
    }).done(action(() => {
      this.markPinned(score, toPin);
      $.publish('score:pin', [toPin, score]);
    })) as JQuery.jqXHR<void>;
  }

  canBePinned(score: SoloScoreJson) {
    return score.current_user_attributes.pin != null && score.passed;
  }

  isPinned(score: SoloScoreJson) {
    const pin = score.current_user_attributes.pin;

    if (pin == null) {
      return false;
    }

    if (!this.pins.has(pin.score_id)) {
      runInAction(() => {
        this.pins.set(pin.score_id, pin.is_pinned);
      });
    }

    return this.pins.get(pin.score_id);
  }

  @action
  markPinned(score: SoloScoreJson, isPinned: boolean) {
    const pin = score.current_user_attributes.pin;
    if (pin == null) return;

    this.pins.set(pin.score_id, isPinned);
  }
}
