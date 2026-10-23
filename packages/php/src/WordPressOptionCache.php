<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

/**
 * Keeps the state in a WordPress option (not a transient: transients can vanish, and the last good copy must not).
 * Not autoloaded, so it is only read on the pages that show activities.
 */
final class WordPressOptionCache implements Cache
{
    public function __construct(private readonly string $option = 'activity_feed_state')
    {
    }

    public function read(): ?array
    {
        $state = get_option($this->option, null);
        return is_array($state) ? $state : null;
    }

    public function write(array $state): void
    {
        update_option($this->option, $state, false);
    }
}
