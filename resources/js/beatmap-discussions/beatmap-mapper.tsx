// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

import UserAvatar from 'components/user-avatar';
import UserLink from 'components/user-link';
import { UserJsonMinimum } from 'interfaces/user-json';
import * as React from 'react';

interface Props {
  onRemoveUser?: (user: UserJsonMinimum) => void;
  user: UserJsonMinimum;
}

function createRemoveMapperHandler(user: UserJsonMinimum, onRemoveClick: NonNullable<Props['onRemoveUser']>) {
  return (_event: React.MouseEvent<HTMLButtonElement>) => {
    onRemoveClick(user);
  };
}

export default class BeatmapMapper extends React.PureComponent<Props> {
  render() {
    return (
      <div className='beatmap-mapper'>
        <UserLink className='beatmap-mapper__user' user={this.props.user}>
          <div className='beatmap-mapper__avatar'>
            <UserAvatar modifiers='full-circle' user={this.props.user} />
          </div>
          <div className='u-ellipsis-overflow'>
            {this.props.user.username}
          </div>
        </UserLink>
        {this.props.onRemoveUser != null && (
          <button className='beatmap-mapper__remove' onClick={createRemoveMapperHandler(this.props.user, this.props.onRemoveUser)}>
            <span className='fas fa-times' />
          </button>
        )}
      </div>
    );
  }
}
