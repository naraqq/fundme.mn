<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'phone',
        'email',
        'password',
        'bio',
        'city',
        'is_company',
        'company_verified',
        'website',
        'logo_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'logo_path',
    ];

    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? '/storage/'.$this->logo_path : null;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'phone_verified_at' => 'datetime',
            'is_company' => 'boolean',
            'company_verified' => 'boolean',
            'is_admin' => 'boolean',
        ];
    }

    public function debts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Debt::class);
    }

    public function payments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** People who follow this user. */
    public function followers(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'followed_id', 'follower_id')->withTimestamps();
    }

    /** People this user follows. */
    public function following(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'followed_id')->withTimestamps();
    }

    public function scopeCompanies(\Illuminate\Database\Eloquent\Builder $q): \Illuminate\Database\Eloquent\Builder
    {
        return $q->where('is_company', true);
    }

    public function isFollowing(User $other): bool
    {
        return $this->following()->whereKey($other->id)->exists();
    }

    /** Community size for social proof: total members and how many joined this week. */
    public static function growth(): array
    {
        return [
            'users' => static::count(),
            'usersWeek' => static::where('created_at', '>=', now()->subDays(7))->count(),
        ];
    }

    /** Only what's safe to show anyone: never phone or email. */
    public function toPublic(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'city' => $this->city,
            'bio' => $this->bio,
            'joined' => $this->created_at?->toIso8601String(),
            'is_company' => (bool) $this->is_company,
            'company_verified' => (bool) $this->company_verified,
            'website' => $this->website,
            'logo_url' => $this->logo_url, // company logo, or a person's profile photo
            // Signed up with a verified Mongolian number: the site's main anti-fake signal. (Never the number itself.)
            'phone_verified' => $this->phone_verified_at !== null,
        ];
    }
}
