<?php

// Only the rules this app uses; anything missing falls back to English.
return [
    'boolean' => ':attribute талбар үнэн эсвэл худал байх ёстой.',
    'confirmed' => ':attribute баталгаажуулалт таарахгүй байна.',
    'email' => ':attribute зөв имэйл хаяг байх ёстой.',
    'in' => 'Сонгосон :attribute буруу байна.',
    'integer' => ':attribute бүхэл тоо байх ёстой.',
    'lowercase' => ':attribute жижиг үсгээр бичигдэх ёстой.',
    'max' => [
        'file' => ':attribute :max килобайтаас их байж болохгүй.',
        'numeric' => ':attribute :max-аас ихгүй байх ёстой.',
        'string' => ':attribute :max тэмдэгтээс урт байж болохгүй.',
    ],
    'min' => [
        'numeric' => ':attribute хамгийн багадаа :min байх ёстой.',
        'string' => ':attribute хамгийн багадаа :min тэмдэгт байх ёстой.',
    ],
    'required' => ':attribute талбарыг бөглөнө үү.',
    'string' => ':attribute текст байх ёстой.',
    'unique' => 'Энэ :attribute аль хэдийн бүртгэгдсэн байна.',
    'file' => ':attribute файл байх ёстой.',
    'image' => ':attribute зураг байх ёстой.',
    'mimes' => ':attribute нь :values төрлийн файл байх ёстой.',
    'current_password' => 'Нууц үг буруу байна.',

    'attributes' => [
        'name' => 'Нэр',
        'age' => 'Нас',
        'city' => 'Хот',
        'title' => 'Гарчиг',
        'story' => 'Түүх',
        'category' => 'Ангилал',
        'creditor' => 'Төлбөр хүлээн авагч',
        'amount' => 'Дүн',
        'message' => 'Мессеж',
        'email' => 'Имэйл',
        'password' => 'Нууц үг',
        'bill' => 'Нэхэмжлэл',
        'photo' => 'Зураг',
        'receipt' => 'Баримт',
        'reference' => 'Гүйлгээний дугаар',
        'note' => 'Тэмдэглэл',
    ],
];
