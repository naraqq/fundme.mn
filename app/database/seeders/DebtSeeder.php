<?php

namespace Database\Seeders;

use App\Models\Debt;
use App\Models\Disbursement;
use App\Models\Payment;
use App\Models\User;
use App\Services\VerifyMn;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class DebtSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::firstOrCreate(['email' => 'poster@example.com'], ['name' => 'Туршилтын хэрэглэгч', 'password' => 'password']);
        $admin = User::firstOrCreate(['email' => 'admin@example.com'], ['name' => 'fundme.mn Admin', 'password' => 'password']);
        $admin->forceFill(['is_admin' => true])->save();
        $this->attachDevAdminPhone($admin);

        // A few patrons so donor lists look like real people.
        $patrons = collect([
            ['patron@example.com', 'Т. Ганболд', 'Улаанбаатар', 'Жижиг бизнес эрхлэгч. Сар бүр дор хаяж нэг оюутанд тусалдаг.'],
            ['patron2@example.com', 'Б. Сарангэрэл', 'Дархан', 'Эмч. Эрүүл мэнд, хүүхдийн хоолонд илүү тусалдаг.'],
            ['patron3@example.com', 'Д. Тэмүүжин', 'Улаанбаатар', 'Програм хангамжийн инженер. Жижиг төлбөр — том өөрчлөлт!'],
            ['patron4@example.com', 'Э. Нандин', 'Эрдэнэт', 'Бага ангийн багш. Сурагчдын хоол, унааны мөнгөнд тусална.'],
        ])->map(fn ($p) => User::firstOrCreate(['email' => $p[0]], ['name' => $p[1], 'city' => $p[2], 'bio' => $p[3], 'password' => 'password']));
        $owner->update(['city' => 'Улаанбаатар', 'bio' => 'Туршилтын хэрэглэгч — жишээ хүсэлтүүдийг нийтэлсэн.']);

        // Who follows whom (indexes into $patrons; 'owner' = the demo poster).
        foreach ([[0, 1], [0, 2], [1, 0], [2, 0], [2, 3], [3, 1], ['owner', 0], ['owner', 2]] as [$from, $to]) {
            $follower = $from === 'owner' ? $owner : $patrons[$from];
            $follower->following()->syncWithoutDetaching([$patrons[$to]->id]);
        }

        $note = 'Иргэний үнэмлэх болон нэхэмжлэлийг шалгасан. Зээлдүүлэгчтэй утсаар холбогдож дүнг баталгаажуулсан.';

        // [name, age, city, title, story, category, creditor, amount, verified, color, payments[[amount, anonymous, message]]]
        $rows = [
            // ── Larger debts ──
            ['Бат-Эрдэнэ', 27, 'Улаанбаатар', 'Ажилгүй болсны дараах машины зээл',
                'Такси барихаар машины зээл авсан. Гурван сарын дараа ажиллаж байсан компани маань хаагдсан. Одоо барилгад ажиллаж байгаа ч зээлийн хүү бүх орлогыг минь идэж байна.',
                'loan', 'Хаан банк', 8_400_000, true, 'amber', [[1_500_000, true, 'Тэвчээртэй байгаарай, ах аа.']]],
            ['Оюунчимэг', 34, 'Дархан', 'Охиныхоо хагалгааны төлбөр',
                '6 настай охин маань Сөүлд зүрхний хагалгаанд орсон. Гэрээ зарсан ч эмнэлэгт өртэй хэвээр. Охин маань одоо эрүүл болсон — би зүгээр л утас дуугарахаас айхаа больмоор байна.',
                'medical', 'Интермед эмнэлэг', 12_000_000, true, 'rose', [[5_000_000, false, 'Бяцхан охинд ❤️'], [1_000_000, true, null]]],
            ['Тэмүүлэн', 20, 'Эрдэнэт', 'Их сургуулийн сүүлийн жил',
                'Манай гэр бүлээс их сургуульд орсон анхны хүн нь би. Компьютерийн ухааны сүүлийн нэг жил үлдсэн ч төлбөрөө төлөхгүй бол улиралдаа бүртгүүлж чадахгүй.',
                'tuition', 'МУИС', 3_600_000, true, 'sky', []],
            ['Сарнай', 41, 'Улаанбаатар', 'Гурван сарын түрээсний төлбөр',
                'Хоёр хүүхэдтэй ганц бие ээж. Зун ажлын цаг маань хасагдсан. Түрээслүүлэгч тэвчээртэй байгаа ч өвөл болохоос өмнө төлж барагдуулах хэрэгтэй.',
                'rent', 'Түрээслүүлэгч (гэрээ баталгаажсан)', 2_700_000, false, 'violet', []],
            ['Ганзориг', 58, 'Ховд', 'Өвлийн өмнөх түлш, цахилгааны төлбөр',
                'Тэтгэвэрт гарсан малчин. Энэ жил тэтгэвэр маань нүүрс, цахилгааны төлбөрт хүрэлцэхгүй байна. Хасах 35 хэм ойртож байна.',
                'utility', 'Баруун бүсийн эрчим хүчний систем', 850_000, true, 'emerald', [[850_000, false, 'Дулаахан өвөлжөөрэй 🔥']]],

            // ── Small everyday bills ──
            ['Анужин', 19, 'Улаанбаатар', 'Энэ сарын утасны төлбөр',
                'Нэгдүгээр курсын оюутан. Хичээлийн групп, ээжтэйгээ холбоотой байх цорын ганц зам маань утас. Тэтгэлэг ирэх хүртэл утас маань хаагдах гэж байна.',
                'phone', 'Юнител', 28_000, true, 'violet', []],
            ['Төгөлдөр', 15, 'Сүхбаатар', 'Долоо хоногийн өдрийн хоолны мөнгө',
                'Аав ээж хоёр маань хөдөө малтай. Би аймгийн төвд эмээтэйгээ сургуульд сурдаг. Сургуулийн цайны газарт 7 хоногийн хоолны мөнгө 25 мянга.',
                'food', 'Сүхбаатар аймгийн 1-р сургуулийн цайны газар', 25_000, true, 'orange', [[10_000, true, 'Сайн сураарай 📚']]],
            ['Номин', 21, 'Улаанбаатар', 'Автобусны картаа цэнэглэх',
                'Оюутан, орой нь кафед цагаар ажилладаг. Цалин 10 хоногийн дараа орно, тэр болтол ажил, сургууль хоёр руугаа явах унааны мөнгө алга.',
                'transport', 'U-Money (нийтийн тээврийн карт)', 20_000, true, 'sky', []],
            ['Мөнхзул', 32, 'Налайх', 'Хүүхдийн цэцэрлэгийн хоолны төлбөр',
                'Хоёр хүүхэдтэй. Нөхөр маань гэмтэл авснаас хойш би ганцаараа ажиллаж байна. Бага хүүгийн цэцэрлэгийн хоолны төлбөр хоёр сар хуримтлагдсан.',
                'food', 'Налайхын 3-р цэцэрлэг', 45_000, true, 'amber', [[20_000, false, 'Хүүд маань ч гэсэн 💛']]],
            ['Энхбаяр', 67, 'Баянхонгор', 'Интернэтийн төлбөр — ач нартайгаа ярих',
                'Ганцаараа амьдардаг. Хотод байгаа ач нартайгаа видео дуудлагаар л уулздаг. Тэтгэвэр маань эмэнд зарцуулагдаад интернэтийн төлбөр хоцорчихлоо.',
                'utility', 'Скаймедиа', 35_000, true, 'emerald', []],
            ['Батсайхан', 24, 'Дархан', 'Утасны төлбөр — ажил хайж байна',
                'Ажлаас халагдсан, ярилцлагад урих дуудлага хүлээж байгаа. Утас хаагдвал ажлын санал алдчихна гэж айж байна.',
                'phone', 'Мобиком', 42_000, true, 'rose', [[30_000, false, 'Амжилт хүсье, ажилтай болоорой!'], [12_000, true, null]]],
            ['Солонго', 18, 'Ховд', 'ЭЕШ-ийн бүртгэлийн хураамж',
                'Арван хоёрдугаар ангийн сурагч. Анагаахад орохыг мөрөөддөг. Бүртгэл хаагдахаас өмнө хураамжаа төлөх хэрэгтэй.',
                'tuition', 'Боловсролын үнэлгээний төв', 30_000, true, 'violet', []],
            ['Ариунаа', 20, 'Улаанбаатар', 'Дотуур байрны сарын хоол',
                'Говь-Алтайгаас ирсэн оюутан. Дотуур байрны хоолны талон сар бүр 90 мянга. Энэ сард гэрээсээ мөнгө ирээгүй.',
                'food', 'МУБИС-ийн дотуур байр', 90_000, true, 'orange', [[25_000, true, null], [15_000, false, 'Би ч бас дотуур байранд амьдарч байсан. Тэвчээрэй!']]],
            ['Гантулга', 45, 'Эрдэнэт', 'Цахилгааны төлбөр — тасалгаанаас өмнө',
                'Гурван хүүхэдтэй. Энэ сард цалин хоцорсон тул цахилгааны төлбөрөө төлж чадсангүй. Даваа гарагт тасална гэсэн мэдэгдэл ирсэн.',
                'utility', 'Эрдэнэтийн цахилгаан түгээх сүлжээ', 68_000, true, 'amber', []],
            ['Цэцэг', 29, 'Улаанбаатар', 'Хүүхдийн эмийн сангийн төлбөр',
                'Хүү маань уушгины хатгалгаа туссан. Эмийн сангийнхан эмийг зээлээр өгсөн, 2 долоо хоногт төлнө гэж амласан.',
                'medical', 'Монос эмийн сан', 55_000, true, 'rose', []],
            ['Билгүүн', 17, 'Улаанбаатар', 'Сургууль хүртэлх унааны мөнгө',
                'Шинэ хороолол руу нүүсэн, сургууль маань 12 км зайтай. Сар бүрийн автобусны мөнгө 22 мянга, аав маань ганцаараа биднийг тэжээдэг.',
                'transport', 'U-Money (нийтийн тээврийн карт)', 22_000, true, 'sky', []],
        ];

        // Scene photos from Wikimedia Commons (see seeders/photos/credits.json).
        $photoDir = database_path('seeders/photos');
        $credits = json_decode(file_get_contents("$photoDir/credits.json"), true);
        $slugs = [
            'Бат-Эрдэнэ' => 'bat-erdene', 'Оюунчимэг' => 'oyunchimeg', 'Тэмүүлэн' => 'temuulen', 'Сарнай' => 'sarnai',
            'Анужин' => 'anujin', 'Төгөлдөр' => 'tuguldur', 'Номин' => 'nomin', 'Мөнхзул' => 'munkhzul',
        ];

        $count = count($rows);
        foreach ($rows as $i => [$name, $age, $city, $title, $story, $category, $creditor, $amount, $verified, $color, $payments]) {
            $created = now()->subDays($count - $i)->subHours(($i * 5) % 11);
            $verifiedAt = $created->copy()->addHours(5);

            $bill = "bills/demo-$i.txt";
            Storage::put($bill, "DEMO BILL\n$creditor\n$name — ₮$amount");

            $debt = $owner->debts()->create([
                ...compact('name', 'age', 'city', 'title', 'story', 'category', 'creditor', 'amount', 'color'),
                'bill_path' => $i % 2 === 0 ? $bill : null, // supporting documents are optional
                // Fake payout account (admin-only), so the transfer queue looks real.
                'bank_name' => config('payments.banks')[$i % count(config('payments.banks'))],
                'bank_account' => (string) (5000000000 + $i * 1_234_567),
                'account_holder' => $name,
                ...$this->photo($slugs[$name] ?? null, $photoDir, $credits),
                'status' => $verified ? 'verified' : 'pending',
                'verified_at' => $verified ? $verifiedAt : null,
                'verification_note' => $verified ? $note : null,
            ]);
            $debt->forceFill(['created_at' => $created])->save();

            foreach ($payments as $k => [$paid, $anon, $msg]) {
                $patron = $patrons[($i + $k) % $patrons->count()];
                $payment = $debt->payments()->create([
                    'user_id' => $patron->id,
                    'payer_name' => $anon ? 'Anonymous' : $patron->name,
                    'anonymous' => $anon,
                    'amount' => $paid,
                    'message' => $msg,
                ]);
                $payment->forceFill(['created_at' => min(now(), $verifiedAt->copy()->addHours(6 * ($k + 1)))])->save();
            }
        }

        // Company donor accounts — verified organizations that give to several requests.
        $companies = collect([
            ['khanbank@example.com', 'Хаан Банк', 'khanbank.com', 'Монголын тэргүүлэх банк. Нийгмийн хариуцлагын хүрээнд оюутан, өрхийн тусламжийг дэмждэг.'],
            ['mcs@example.com', 'МСС Групп', 'mcs.mn', 'Монголын хамгийн том холдинг компани. Эрүүл мэнд, боловсролын төслүүдийг ивээн тэтгэдэг.'],
            ['gobi@example.com', 'Гоби ХК', 'gobi.mn', 'Дэлхийд алдартай ноолууран бүтээгдэхүүний үйлдвэр. Хөдөөгийн малчдыг дэмждэг.'],
            ['unitel@example.com', 'Юнител', 'unitel.mn', 'Холбоо, технологийн компани. Залуус, оюутнуудын боловсролыг дэмждэг.'],
        ])->map(fn ($c, $i) => User::firstOrCreate(['email' => $c[0]], [
            'name' => $c[1], 'website' => $c[2], 'bio' => $c[3],
            'is_company' => true,
            'company_verified' => $i < 3, // Юнител left unverified to show the admin review flow
            'password' => 'password',
        ]));

        // Demo uploaded logos for two of them (the others fall back to the branded tile).
        foreach (['khanbank@example.com' => 'khanbank', 'mcs@example.com' => 'mcs'] as $email => $slug) {
            $file = database_path("seeders/logos/$slug.png");
            if (is_file($file)) {
                $path = "logos/demo-$slug.png";
                Storage::disk('public')->put($path, file_get_contents($file));
                $companies->firstWhere('email', $email)?->update(['logo_path' => $path]);
            }
        }

        // Company donations to various verified requests (named, so they rank publicly).
        $verified = $owner->debts()->where('status', 'verified')->get();
        $companyGifts = [
            [0, 'Тэмүүлэн', 3_600_000, 'Боловсролд хөрөнгө оруулахаас илүү үнэ цэнэтэй зүйл үгүй. Амжилт!'],
            [0, 'Анужин', 28_000, null],
            [1, 'Оюунчимэг', 4_000_000, 'Эрүүл мэнд бол хамгийн чухал. Бид таны хажууд байна.'],
            [1, 'Цэцэг', 55_000, null],
            [2, 'Ганзориг', 200_000, 'Хөдөөгийн ахмадуудаа мартдаггүй.'],
            [2, 'Ариунаа', 90_000, null],
            [3, 'Тэмүүлэн', 500_000, null],
            [3, 'Солонго', 30_000, 'Ирээдүйн эмч нарт зориулж 🎓'],
        ];
        foreach ($companyGifts as $k => [$ci, $who, $amount, $msg]) {
            $debt = $verified->firstWhere('name', $who);
            // Never over-fund, and leave a realistic amount open: at most ~60% of what's left, rounded to ₮1,000.
            $left = $debt ? $debt->amount - $debt->paid : 0;
            $amount = min($amount, intdiv((int) ($left * 0.6), 1000) * 1000);
            if ($amount < 1000) {
                continue;
            }
            $gift = $debt->payments()->create([
                'user_id' => $companies[$ci]->id,
                'payer_name' => $companies[$ci]->name,
                'anonymous' => false,
                'amount' => $amount,
                'message' => $msg,
            ]);
            $gift->forceFill(['created_at' => now()->subDays(3)->addHours($k)])->save();
        }

        // A few people follow the companies.
        foreach ($patrons as $p) {
            $p->following()->syncWithoutDetaching($companies->random(2)->pluck('id')->all());
        }

        // Unconfirmed payments, to show their statuses in patron@example.com's dashboard.
        // They never count toward totals, progress or leaderboards.
        $patron = User::where('email', 'patron@example.com')->first();
        $stillOpen = Debt::withPaid()->open()->get()->filter(fn ($d) => $d->remaining >= 20_000)->values();
        if ($patron && $stillOpen->count() >= 2) {
            foreach ([[$stillOpen[0], 20_000, Payment::PENDING], [$stillOpen[1], 15_000, Payment::FAILED]] as [$debt, $amount, $status]) {
                $debt->payments()->create([
                    'user_id' => $patron->id,
                    'payer_name' => $patron->name,
                    'anonymous' => false,
                    'amount' => $amount,
                    'fee' => Payment::feeFor($amount),
                    'status' => $status,
                ]);
            }
        }

        // Money already forwarded to creditors, each with a public verification code.
        $transfers = [
            ['Оюунчимэг', 5_000_000, 'KHAN-20261121-88412'],
            ['Ганзориг', 850_000, 'KHAN-20261123-90233'],
            ['Батсайхан', 42_000, 'GOLOMT-20261124-11307'],
        ];
        foreach ($transfers as [$who, $sum, $ref]) {
            $debt = $owner->debts()->where('name', $who)->first();
            $receipt = 'receipts/demo-'.$debt->id.'.txt';
            Storage::put($receipt, "DEMO TRANSFER RECEIPT\nTo: {$debt->creditor}\nAmount: ₮$sum\nRef: $ref");
            $debt->disbursements()->create([
                'user_id' => $admin->id,
                'code' => Disbursement::newCode(),
                'amount' => $sum,
                'reference' => $ref,
                'receipt_path' => $receipt,
                'paid_at' => now()->subHours(3),
            ]);
        }
    }

    /** Copy a demo photo to the public disk and return its columns (or none). */
    private function photo(?string $slug, string $dir, array $credits): array
    {
        if (! $slug || ! is_file("$dir/$slug.jpg")) {
            return [];
        }
        $path = "photos/demo-$slug.jpg";
        Storage::disk('public')->put($path, file_get_contents("$dir/$slug.jpg"));
        $c = $credits[$slug];

        return [
            'photo_path' => $path,
            'photo_credit' => "{$c['author']} · {$c['license']}",
            'photo_credit_url' => $c['source'],
        ];
    }

    /**
     * DEV ONLY: put DEV_ADMIN_PHONE (from .env) on an admin account, so phone login still gets you in after
     * `migrate:fresh --seed`. If someone already has that phone (seeding without a reset), they become the admin.
     */
    private function attachDevAdminPhone(User $admin): void
    {
        $phone = VerifyMn::normalizePhone((string) config('services.verify_mn.dev_admin_phone'));
        if (! $phone || app()->isProduction()) {
            return;
        }

        $existing = User::where('phone', $phone)->first();
        ($existing ?? $admin)->forceFill(['phone' => $phone, 'phone_verified_at' => now(), 'is_admin' => true])->save();
        $this->command?->info('Admin login by phone: ****'.substr($phone, -4));
    }
}
