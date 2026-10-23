<?php

declare(strict_types=1);

namespace InquilabMadrid\ActivityFeed;

final class Place
{
    public function __construct(
        public readonly ?string $name,
        public readonly ?string $municipality,
        public readonly ?string $province,
        public readonly ?float $latitude,
        public readonly ?float $longitude,
    ) {
    }

    /** @return array{name: ?string, municipality: ?string, province: ?string, latitude: ?float, longitude: ?float} */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'municipality' => $this->municipality,
            'province' => $this->province,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
        ];
    }
}
