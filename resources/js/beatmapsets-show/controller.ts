// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

import { BeatmapsetJsonForShow } from 'interfaces/beatmapset-extended-json';
import { TagJsonWithCount } from 'interfaces/tag-json';
import UserJson from 'interfaces/user-json';
import { keyBy } from 'lodash';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { deletedUserJson } from 'models/user';
import core from 'osu-core-singleton';
import { find, findDefault, group } from 'utils/beatmap-helper';
import { parse } from 'utils/beatmapset-page-hash';
import { parseJson } from 'utils/json';
import { present } from 'utils/string';
import { currentUrl } from 'utils/turbolinks';

export type ScoreLoadingState = null | 'error' | 'loading' | 'supporter_only' | 'unranked';

type BeatmapJsonForBeatmapsetShow = BeatmapsetJsonForShow['converts'][number];

interface State {
  beatmapId?: BeatmapJsonForBeatmapsetShow['id'];
  beatmapset: BeatmapsetJsonForShow;
  playmode?: BeatmapJsonForBeatmapsetShow['mode'];
  showingNsfwWarning: boolean;
}

export default class Controller {
  @observable hoveredBeatmap: null | BeatmapJsonForBeatmapsetShow = null;
  @observable state: State;

  @computed
  get beatmaps() {
    return group([...this.beatmapset.beatmaps, ...this.beatmapset.converts]);
  }

  get beatmapset() {
    return this.state.beatmapset;
  }

  @computed
  get currentBeatmap() {
    let beatmap: BeatmapJsonForBeatmapsetShow | null | undefined = null;

    if (this.state.playmode != null) {
      if (this.state.beatmapId != null) {
        beatmap ??= find({
          group: this.beatmaps,
          id: this.state.beatmapId,
          mode: this.state.playmode,
        });
      }

      beatmap ??= findDefault({
        items: this.beatmaps.get(this.state.playmode) ?? [],
      });
    }

    beatmap ??= findDefault({
      group: this.beatmaps,
    });

    if (beatmap == null) {
      throw new Error('failed to find default beatmap');
    }

    return beatmap;
  }

  @computed
  get currentBeatmaps() {
    return this.beatmaps.get(this.currentBeatmap.mode) ?? [];
  }

  get relatedTags() {
    const map = new Map();

    for (const tag of this.beatmapset.related_tags) {
      map.set(tag.id, tag);
    }

    return map;
  }

  @computed
  get tags() {
    const mapperTagSet = new Set(this.beatmapset.tags.split(' ').filter(present));
    const tagMap = new Map<number, TagJsonWithCount>();

    for (const tag of this.beatmapset.related_tags) {
      tag.count = 0; // assign 0 and cast
      tagMap.set(tag.id, tag as TagJsonWithCount);
    }

    for (const beatmap of this.beatmapset.beatmaps) {
      if (beatmap.top_tag_ids == null) continue;

      for (const tagId of beatmap.top_tag_ids) {
        const tag = tagMap.get(tagId.id);
        if (tag == null) continue;

        tag.count += tagId.count;

        // TODO: case insensitivity
        if (mapperTagSet.has(tag.name)) {
          tag.count++;
          mapperTagSet.delete(tag.name);
        }
      }
    }

    return {
      mapperTags: [...mapperTagSet.values()],
      userTags: [...tagMap.values()].sort((a, b) => {
        const diff = b.count - a.count;
        return diff !== 0 ? diff : a.id - b.id;
      }),
    };
  }

  @computed
  get usersById() {
    return keyBy(this.beatmapset.related_users, 'id') as Partial<Record<number, UserJson>>;
  }

  constructor(private readonly container: HTMLElement) {
    let state: State | null = null;
    try {
      state = JSON.parse(this.container.dataset.state ?? 'null') as (State | null);
    } catch {
      // Do nothing if failed parsing.
    }

    if (state == null) {
      const optionsHash = parse(currentUrl().hash);
      const beatmapset = parseJson<BeatmapsetJsonForShow>('json-beatmapset');

      state = {
        beatmapId: optionsHash.beatmapId,
        beatmapset,
        playmode: optionsHash.playmode,
        showingNsfwWarning: beatmapset.nsfw && runInAction(() => !core.userPreferences.get('beatmapset_show_nsfw')),
      };
    }

    this.state = state;

    makeObservable(this);

    $(document).on('turbo:before-cache', this.saveState);
  }

  destroy() {
    this.saveState();
    $(document).off('turbo:before-cache', this.saveState);
  }

  owners(beatmap: BeatmapJsonForBeatmapsetShow) {
    return beatmap.owners.map((mapper) => this.usersById[mapper.id] ?? deletedUserJson);
  }

  @action
  readonly setCurrentBeatmap = (beatmap: BeatmapJsonForBeatmapsetShow) => {
    if (beatmap === this.currentBeatmap) return;

    this.state.beatmapId = beatmap.id;
    this.state.playmode = beatmap.mode;
  };

  private readonly saveState = () => {
    this.container.dataset.state = JSON.stringify(this.state);
  };
}
