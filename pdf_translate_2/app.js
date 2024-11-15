// PDF.js 글로벌 객체 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';

const fileInput = document.getElementById('file-input');
const pdfContent = document.getElementById('pdf-content');
const translateButton = document.getElementById('translate-button');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                renderAllPagesAsStructuredText(pdf);
            }).catch(function(error){
                console.error('PDF 로딩 오류:', error);
                alert('PDF 로딩 중 오류가 발생했습니다.');
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('PDF 파일을 선택해주세요.');
    }
});

async function renderAllPagesAsStructuredText(pdf) {
    pdfContent.innerHTML = ''; // 기존 내용 초기화
    const numPages = pdf.numPages;
    let pagesProcessed = 0;
    let maxFontSize = 0;

    // 먼저 전체 페이지를 순회하여 최대 폰트 크기를 찾습니다.
    const fontSizes = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {
            if (item.transform && item.transform.length >= 5) {
                // PDF.js의 transform 배열에서 폰트 크기 추출
                const fontSize = item.transform[0];
                fontSizes.push(fontSize);
            }
        });
    }
    maxFontSize = Math.max(...fontSizes);

    // 이제 각 페이지를 순회하며 텍스트를 추출하고 정제합니다.
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        pdf.getPage(pageNum).then(async function(page) {
            try {
                const textContent = await page.getTextContent();
                const pageDiv = document.createElement('div');
                pageDiv.style.marginBottom = '20px';

                let pageText = '';
                let previousFontSize = 0;
                let listType = null; // 'ul' 또는 'ol'
                let listElement = null;

                // 임시 변수: 리스트 항목을 저장
                let listItems = [];

                textContent.items.forEach(item => {
                    let text = item.str.trim();
                    if (text) {
                        const fontSize = item.transform[0];
                        const fontWeight = item.fontName.includes('Bold') ? 'bold' : 'normal';

                        // 리스트 번호 패턴 감지 (예: 1., 2., 3.)
                        const orderedListMatch = /^\d+\.$/.test(text);
                        // 불릿 패턴 감지 (예: •, -, *)
                        const bulletMatch = /^•$|^-$|^\*$/.test(text);

                        if (orderedListMatch) {
                            // 다음 텍스트가 리스트 항목일 것으로 예상
                            listType = 'ol';
                            if (!listElement) {
                                listElement = document.createElement(listType);
                                pageDiv.appendChild(listElement);
                            }
                        } else if (bulletMatch) {
                            // 불릿 리스트 시작
                            listType = 'ul';
                            if (!listElement) {
                                listElement = document.createElement(listType);
                                pageDiv.appendChild(listElement);
                            }
                        } else {
                            // 리스트 항목 텍스트
                            if (listType) {
                                // 리스트 항목으로 추가
                                const li = document.createElement('li');
                                li.textContent = text;
                                listElement.appendChild(li);
                            } else {
                                // 일반 텍스트
                                pageText += text + ' ';
                            }
                        }
                    }
                });

                // 텍스트 정제: 불필요한 줄바꿈 제거
                pageText = pageText.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ');

                // 단락 분리
                const paragraphs = pageText.split(/(?<=[.?!])\s+/);
                paragraphs.forEach(paragraphText => {
                    const paragraph = document.createElement('p');
                    paragraph.textContent = paragraphText;
                    pageDiv.appendChild(paragraph);
                });

                pdfContent.appendChild(pageDiv);
                pagesProcessed++;
                if (pagesProcessed === numPages) {
                    alert('PDF 로드 완료! 번역하려면 "번역하기" 버튼을 클릭하세요.');
                }
            } catch (error) {
                console.error(`페이지 ${pageNum} 텍스트 추출 오류:`, error);
                alert(`페이지 ${pageNum} 텍스트 추출 중 오류가 발생했습니다.`);
            }
        }).catch(function(error){
            console.error(`페이지 ${pageNum} 로딩 오류:`, error);
            alert(`페이지 ${pageNum} 로딩 중 오류가 발생했습니다.`);
        });
    }
}

translateButton.addEventListener('click', () => {
    // 페이지의 lang 속성을 변경하여 번역 제안 유도
    const currentLang = document.documentElement.lang;
    document.documentElement.lang = currentLang === 'ko' ? 'en' : 'ko';
    alert('페이지의 언어가 변경되었습니다. 브라우저의 번역 아이콘을 클릭하여 번역을 진행해주세요.');
});
