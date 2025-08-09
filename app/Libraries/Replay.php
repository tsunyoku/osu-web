<?php

// Copyright (c) ppy Pty Ltd <contact@ppy.sh>. Licensed under the GNU Affero General Public License v3.0.
// See the LICENCE file in the repository root for full licence text.

namespace App\Libraries;

use GuzzleHttp\Client;

class Replay
{
    public static function get(int $scoreId, int $rulesetId, bool $legacy): string|null
    {
        $response = (new Client(['base_uri' => $GLOBALS['cfg']['osu']['score_replays']['replay_cache']['server_url']]))
            ->request('GET', $legacy ? "replays/$rulesetId/$scoreId" : "replays/$scoreId", [
                'connect_timeout' => 1,
                'timeout' => 5,
            ]);

        if ($response->getStatusCode() === 404) {
            return null;
        }

        return $response->getBody()->getContents();
    }

    public static function delete(int $scoreId, int $rulesetId, bool $legacy): void
    {
        (new Client(['base_uri' => $GLOBALS['cfg']['osu']['score_replays']['replay_cache']['server_url']]))
            ->request('DELETE', $legacy ? "replays/$rulesetId/$scoreId" : "replays/$scoreId", [
                'connect_timeout' => 1,
                'timeout' => 5,
            ]);
    }
}
