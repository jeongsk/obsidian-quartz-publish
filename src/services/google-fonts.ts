/**
 * Google Fonts Service
 *
 * Google Fonts 관리 및 로딩 서비스
 */

export interface GoogleFont {
	family: string;
	category: string;
}

// 인기 Google Fonts 목록 (Top 30 + Korean fonts)
const POPULAR_FONTS: GoogleFont[] = [
	{ family: 'Roboto', category: 'sans-serif' },
	{ family: 'Open Sans', category: 'sans-serif' },
	{ family: 'Noto Sans KR', category: 'sans-serif' }, // Korean
	{ family: 'Montserrat', category: 'sans-serif' },
	{ family: 'Lato', category: 'sans-serif' },
	{ family: 'Poppins', category: 'sans-serif' },
	{ family: 'Inter', category: 'sans-serif' },
	{ family: 'Roboto Condensed', category: 'sans-serif' },
	{ family: 'Oswald', category: 'sans-serif' },
	{ family: 'Source Sans Pro', category: 'sans-serif' },
	{ family: 'Slabo 27px', category: 'serif' },
	{ family: 'Raleway', category: 'sans-serif' },
	{ family: 'PT Sans', category: 'sans-serif' },
	{ family: 'Merriweather', category: 'serif' },
	{ family: 'Noto Sans', category: 'sans-serif' },
	{ family: 'Nunito', category: 'sans-serif' },
	{ family: 'Rubik', category: 'sans-serif' },
	{ family: 'Lora', category: 'serif' },
	{ family: 'Ubuntu', category: 'sans-serif' },
	{ family: 'Mukta', category: 'sans-serif' },
	{ family: 'Kanit', category: 'sans-serif' },
	{ family: 'Playfair Display', category: 'serif' },
	{ family: 'Schibsted Grotesk', category: 'sans-serif' },
	{ family: 'IBM Plex Mono', category: 'monospace' },
	{ family: 'Nanum Gothic', category: 'sans-serif' }, // Korean
	{ family: 'Nanum Myeongjo', category: 'serif' }, // Korean
	{ family: 'Gowun Dodum', category: 'sans-serif' }, // Korean
	{ family: 'Gowun Batang', category: 'serif' }, // Korean
	{ family: 'Sunflower', category: 'sans-serif' }, // Korean
	{ family: 'Dongle', category: 'sans-serif' }, // Korean
];

export class GoogleFontsService {
	private loadedFonts: Set<string> = new Set();

	/**
	 * 사용 가능한 폰트 목록 반환
	 */
	getFonts(): GoogleFont[] {
		return POPULAR_FONTS.sort((a, b) => a.family.localeCompare(b.family));
	}

	/**
	 * 폰트 CSS URL 생성
	 */
	getCssUrl(fontFamily: string): string {
		const formattedName = fontFamily.replace(/\s+/g, '+');
		return `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;700&display=swap`;
	}

	/**
	 * 폰트 동적 로드 (Preview용)
	 */
	loadFont(fontFamily: string): void {
		if (this.loadedFonts.has(fontFamily)) return;

		const linkId = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
		if (document.getElementById(linkId)) {
			this.loadedFonts.add(fontFamily);
			return;
		}

		// eslint-disable-next-line obsidianmd/no-forbidden-elements
		const link = document.createElement('link');
		link.id = linkId;
		link.href = this.getCssUrl(fontFamily);
		link.rel = 'stylesheet';

		document.head.appendChild(link);
		this.loadedFonts.add(fontFamily);
	}
}
